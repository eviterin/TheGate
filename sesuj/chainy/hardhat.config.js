/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
  },
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 2000
    }
  }
}; 