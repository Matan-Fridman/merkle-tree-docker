const { generateCommitment} = require("./zk-functions")
const {Storage} = require("@google-cloud/storage")
const functions = require("@google-cloud/functions-framework")
const storage = new Storage()
const fs = require("fs")
const { buildMimcSponge } = require("./testing-mimc")
const crypto = require("crypto")
const {BigNumber} = require("ethers")

async function addCommitmentToBucket(){
    const cmt = await generateCommitment()
    await storage.bucket("matan-testing-bucket").upload(`google-cloud-downloads/new-commitment`, {
        destination: cmt.commitment //upload file with commitment as name to bucket
    }).catch(e=>console.log(e));
    console.log("added commitment:", cmt)
}

async function requestProofVerification(commitment){    //upload commitment to bucket
    console.log(commitment)
    const bucketName = "proof-requests"
    await fs.promises.writeFile("google-cloud-downloads/proof-request.json", JSON.stringify(commitment))
    await storage.bucket(bucketName).upload(`google-cloud-downloads/proof-request.json`, {
        destination: commitment.commitment //upload file with commitment as name to bucket
    })
    const [files] = await storage.bucket(bucketName).getFiles();
    for(const fileName of files.map((file)=>file.name)){
        const contents = await storage.bucket(bucketName).file(fileName).download();
        const cmt = JSON.parse(contents.toString())
        console.log("generate proof for cmt: ", cmt)
    }
}
// addCommitmentToBucket()
async function test(){
    const mimc = await buildMimcSponge()
    const nullifier = BigNumber.from(crypto.randomBytes(31)).toString();
    const secret = BigNumber.from(crypto.randomBytes(31)).toString();
    const commitment = mimc.F.toString(mimc.multiHash([nullifier, secret]));
    const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier]));
    console.log( {
        nullifier: nullifier,
        secret: secret,
        commitment: commitment,
        nullifierHash: nullifierHash
    });
}
test()