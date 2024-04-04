const { buildMimcSponge } = require("circomlibjs")
const { BigNumber } = require("ethers")
const crypto = require("crypto")
const fs = require("fs")
const {MerkleTree} = require("merkletreejs")
const snarkjs = require("snarkjs")
const loadWebAssembly = require("./Verifier");
const { Storage} = require("@google-cloud/storage")

module.exports = {generateCommitment, addCommitment, generateAndVerifyProof, getFileNames}
 async function generateCommitment() {
    const mimc = await buildMimcSponge();
    const nullifier = BigNumber.from(crypto.randomBytes(31)).toString();
    const secret = BigNumber.from(crypto.randomBytes(31)).toString();
    const commitment = mimc.F.toString(mimc.multiHash([nullifier, secret]));
    const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier]));
    return {
        nullifier: nullifier,
        secret: secret,
        commitment: commitment,
        nullifierHash: nullifierHash
    };
}
async function addCommitment(preMadeCommitments = undefined) {
    if(preMadeCommitments){ // add commitments from bucket to loacl rep
        const storage = new Storage()
        for(const cmt of preMadeCommitments){
            await fs.promises.appendFile("google-cloud-downloads/merkle-tree-commitments", `, ${cmt}`, "utf-8")
            await storage.bucket("matan-testing-bucket").file(cmt).delete()
        }
    }
    else{   // generate and add commitment locally
        const commitment = await generateCommitment();
        await fs.promises.appendFile("google-cloud-downloads/merkle-tree-commitments", `, ${commitment.commitment}`, "utf-8")
    }
    const mimc = await buildMimcSponge()

    const commitmentData = await fs.promises.readFile("google-cloud-downloads/merkle-tree-commitments", "utf-8")
    const commitments = commitmentData.split(', ');

    const roots = (await fs.promises.readFile("google-cloud-downloads/merkle-tree-roots", "utf-8")).split(", ");  // get current elems
    await fs.promises.readFile("google-cloud-downloads/merkle-tree-commitments", "utf-8")
    const newRoot = calculateMerkleRootAndPath(mimc, commitments)  // calc root with new commitment
    roots.push(newRoot) // add new root to roots array

    if(roots.length>30){
      console.log("removing old root")
      roots.splice(0, 1)  // remove oldest root
    }
    try {
        // await fs.writeFile(downloadedFilePath, JSON.stringify(commitments), "utf-8");
        await fs.promises.writeFile("google-cloud-downloads/merkle-tree-roots", roots.join(", "), "utf-8");
    } catch (error) {
        console.error("Error writing file:", error);
        throw error;
    }
    console.log("successfully added commitment")
    return;
}
 function calculateMerkleRootAndPath(mimc, elements, element=undefined) {
    //   const zeros = generateZeros(mimc, 20);
    
      const treeHashFn = (values) =>{
          // console.log("values:", values)
          const val = values.map((e)=>e.toString("hex"))
          // console.log("val:", val)
          const hash = mimc.F.toString(mimc.multiHash(val))
          return hash
      }
      const elems = elements.map((e)=>e.toString())
      const tree = new MerkleTree(elems, treeHashFn, {
          concatenator: ((v) => {
              return v})
              ,
              fillDefaultHash:()=>{return ZERO_VALUE}
    })
      const layerAmount = tree.getLayerCount()
    
      const layers = tree.getHexLayers().map((layer)=>layer.map((leaf => leaf.substring(2)))) // get hex layers instead of buffers and remove '0x'
      for(let i = layerAmount - 1; i<20;i++){
          const hash = treeHashFn([layers[i][0], zeros[i]])  // start at root and hash with the corresponding zero
          layers.push([hash]) // add layer to layers
      }
      
      const root = layers[layers.length-1][0]
      
      let pathElements = []
      let pathIndices = []
      
      if (element) {
        let index = layers[0].indexOf(element)
        console.log("index:", index)
    
        if(index === -1){
            return false
        }
        for (let level = 0; level < 20; level++) {
            pathIndices[level] = index % 2
            pathElements[level] = (index ^ 1) < layers[level].length ? layers[level][index ^ 1] : zeros[level]
            index >>= 1
        }
        console.log(root, pathElements, pathIndices)
        return {
            root: root,
            pathElements: pathElements,
            pathIndices: pathIndices
        }
      }
      return root
    }
const zeros = [
    '21663839004416932945382355908790599225266501822907911457504978515578255421292',
    '16923532097304556005972200564242292693309333953544141029519619077135960040221',
    '7833458610320835472520144237082236871909694928684820466656733259024982655488',
    '14506027710748750947258687001455876266559341618222612722926156490737302846427',
    '4766583705360062980279572762279781527342845808161105063909171241304075622345',
    '16640205414190175414380077665118269450294358858897019640557533278896634808665',
    '13024477302430254842915163302704885770955784224100349847438808884122720088412',
    '11345696205391376769769683860277269518617256738724086786512014734609753488820',
    '17235543131546745471991808272245772046758360534180976603221801364506032471936',
    '155962837046691114236524362966874066300454611955781275944230309195800494087',
    '14030416097908897320437553787826300082392928432242046897689557706485311282736',
    '12626316503845421241020584259526236205728737442715389902276517188414400172517',
    '6729873933803351171051407921027021443029157982378522227479748669930764447503',
    '12963910739953248305308691828220784129233893953613908022664851984069510335421',
    '8697310796973811813791996651816817650608143394255750603240183429036696711432',
    '9001816533475173848300051969191408053495003693097546138634479732228054209462',
    '13882856022500117449912597249521445907860641470008251408376408693167665584212',
    '6167697920744083294431071781953545901493956884412099107903554924846764168938',
    '16572499860108808790864031418434474032816278079272694833180094335573354127261',
    '11544818037702067293688063426012553693851444915243122674915303779243865603077',
    '18926336163373752588529320804722226672465218465546337267825102089394393880276'
]
const ZERO_VALUE = '21663839004416932945382355908790599225266501822907911457504978515578255421292' // = keccak256("tornado") % FIELD_SIZE
 async function generateAndVerifyProof(commitments, commitment){
    const mimc = await buildMimcSponge()
    const rootAndPath = calculateMerkleRootAndPath(mimc, commitments, commitment.commitment)
    console.log("got root and path")
    if(!rootAndPath){
        return "commitment not found in tree"
    }
    console.log("proving...")
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            nullifier: commitment.nullifier, secret: commitment.secret,
            pathElements: rootAndPath.pathElements, pathIndices: rootAndPath.pathIndices
        },
        getVerifierWASM(),
        "keys/Verifier.zkey"
    )
    console.log("generated proof")
    const vKey = JSON.parse(await fs.promises.readFile("verification_key.json"));
    const result = await snarkjs.groth16.verify(vKey, publicSignals, proof)
    // const rootsPath = await downloadFile("merkle-tree-roots")
    const roots = (await fs.promises.readFile("google-cloud-downloads/merkle-tree-roots", "utf-8")).split(", ")   // array of roots
    console.log("got roots")
    // const nullifierPath = await downloadFile("merkle-tree-nullifiers")
    const nullifiers = (await fs.promises.readFile("google-cloud-downloads/merkle-tree-nullifiers", "utf-8")).split(", ") //array of nullifiers
    console.log("got nullifiers")
    console.log(roots, nullifiers)
    const verification = result && roots.includes(rootAndPath.root) && !nullifiers.includes(publicSignals[0])
    console.log("veriication: ", verification)
    if(verification){
        await fs.promises.appendFile("google-cloud-downloads/merkle-tree-nullifiers", `, ${publicSignals[0]}`, "utf-8")
        console.log("added nullifier to nullifiers")
    }
    return verification
}
function getVerifierWASM() {
    return loadWebAssembly().buffer
}

async function getFileNames() {
    // Lists files in the bucket
    const storage = new Storage()
    const [files] = await storage.bucket("matan-testing-bucket").getFiles();
  
    return files.map((file)=>file.name)
}