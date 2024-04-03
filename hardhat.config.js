/** @type import('hardhat/config').HardhatUserConfig */

require("dotenv").config();
require("@nomiclabs/hardhat-ethers")

const API_URL = process.env.API_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY

module.exports = {
  solidity: {
  compilers: [
   {
     version: "0.8.20",
     settings: {}
   },
   {
     version: "0.7.6", // or any version compatible with OpenZeppelin contracts
     settings: {}
   }]
},
  defaultNetwork:"sepolia",
  networks: {
     sepolia: {
        url: API_URL,
        accounts: [`0x${PRIVATE_KEY}`]
     }
  },
}