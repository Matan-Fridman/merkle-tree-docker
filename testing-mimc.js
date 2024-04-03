const { Scalar, getCurveFromName } = require("ffjavascript")
const {ethers} =require("ethers")

module.exports = {buildMimcSponge}

const SEED = "mimcsponge";
const NROUNDS = 220;


async function buildMimcSponge() {
    const bn128 = await getCurveFromName("bn128", true);
    return new MimcSponge(bn128.Fr);
}

class MimcSponge {
    constructor (F) {
        this.F = F;
        this.cts = this.getConstants(SEED, NROUNDS);
    }

    getIV (seed)  {
        const F = this.F;
        if (typeof seed === "undefined") seed = SEED;
        const c = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed+"_iv"));
        const cn = Scalar.e(c);
        const iv = cn.mod(F.p);
        return iv;
    };

    getConstants (seed, nRounds)  {
        const F = this.F;
        if (typeof seed === "undefined") seed = SEED;
        if (typeof nRounds === "undefined") nRounds = NROUNDS;
        const cts = new Array(nRounds);
        let c = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(SEED));;
        for (let i=1; i<nRounds; i++) {
            c = ethers.utils.keccak256(c);

            cts[i] = F.e(c);
        }
        cts[0] = F.e(0);
        cts[cts.length - 1] = F.e(0);
        return cts;
    };


    multiHash(arr, key, numOutputs)  {
        const F = this.F;
        if (typeof(numOutputs) === "undefined") {
            numOutputs = 1;
        }
        if (typeof(key) === "undefined") {
            key = F.zero;
        }

        let R = F.zero;
        let C = F.zero;

        for (let i=0; i<arr.length; i++) {
            R = F.add(R, F.e(arr[i]));
            const S = this.hash(R, C, key);
            R = S.xL;
            C = S.xR;
        }
        let outputs = [R];
        for (let i=1; i < numOutputs; i++) {
            const S = this.hash(R, C, key);
            R = S.xL;
            C = S.xR;
            outputs.push(R);
        }
        if (numOutputs == 1) {
            return outputs[0];
        } else {
            return outputs;
        }
    }
}