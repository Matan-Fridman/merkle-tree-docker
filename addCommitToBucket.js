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
    const response = await fetch('https://merkle-tree-o4h4ohxpva-ez.a.run.app/get_commitments');
    const data = await response.json(); // Assuming the response is JSON
    console.log(data); 
}
test()