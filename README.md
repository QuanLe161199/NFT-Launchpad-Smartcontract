<a name="readme-top"></a>

<!-- PROJECT NAME -->
<br />
<div align="center">
  <h3 align="center"Launchpad NFT - Smart Contracts</h3>

  <p align="center">
    Smart contracts used to launchpad NFT project
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#prerequisites">Prerequisites</a></li>
    <li><a href="#installation">Installation</a></li>
    <li>
      <a href="#usage">Usage</a>
      <ul>
        <li><a href="#deploy">Deploy</a></li>
        <li>
          <a href="#testing">Testing</a>
          <ul><li><a href="#test-coverage">Test Coverage</a></li></ul>
        </li>
      </ul>
    </li>
    <li><a href="#deployment-to-a-testnet-or-mainnet">Deployment to a testnet or mainnet</a></li>
    <li><a href="#linting">Linting</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

# About The Project

This project contains the source code of Launchpad NFT project, supports deploying, testing smart contracts and getting information about chain Id, address and abi to help front-end interact with these smart contracts.

## Built With

-   [![Solidity][solidity]][solidity-url]
-   [![TypeScript][typescript]][typescript-url]
-   [![OpenZeppelin][openzeppelin]][openzeppelin-url]
-   [![Hardhat][hardhat]][hardhat-url]

# Prerequisites

-   npm
    ```sh
    npm install npm@latest -g
    ```
-   yarn
    ```sh
    npm install --global yarn
    ```

# Installation

1. Clone the repo
    ```sh
    git clone https://gitlab.com/illumia-project/nft-amm-smartcontract.git
    ```
2. Install packages
    ```sh
    yarn
    ```

# Usage

## Deploy

```
yarn hardhat deploy
```

## Testing

```
yarn hardhat test
```

### Test Coverage

```
yarn hardhat coverage
```
### Verify The Deployed Contract Using Frontend
```
yarn hardhat verify --constructor-args arguments.ts <CONTRACT_ADDRESS> --network <NETWORK>
```

# Deployment to a testnet or mainnet

1. Setup environment variables
   <a name="setup-environment-variables"></a>
   Create a `.env` file, similar to what your see in `.env.example`

```
MAINNET_RPC_URL='https://eth-mainnet.g.alchemy.com/v2/your-api-key'
GOERLI_RPC_URL='https://eth-goerli.g.alchemy.com/v2/your-api-key'
PRIVATE_KEY='YOUR_PRIVATE_KEY'
REPORT_GAS=false
ETHERSCAN_API_KEY='YOUR_API_KEY'
```

-   `MAINNET_RPC_URL`: This is url of the mainnet node you're working with. You can get setup with one for free from [Alchemy](https://alchemy.com/?a=673c802981)
-   `GOERLI_RPC_URL`: This is url of the goerli testnet node you're working with. You can get setup with one for free from [Alchemy](https://alchemy.com/?a=673c802981)
-   `SEPOLIA_RPC_URL`: This is url of the sepolia testnet node you're working with. You can get setup with one for free from [Infura](https://www.infura.io/)
-   `PRIVATE_KEY`: The private key of your account (like from [metamask](https://metamask.io/)). **NOTE:** FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.
    -   You can [learn how to export it here](https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key).
-   `ETHERSCAN_API_KEY`: This is the api key used for smart contract verification on etherscan. You can get one for free here [Etherscan](https://etherscan.io/)

2. Get testnet ETH

-   You can get testnet eth by mining here [Faucet Link](https://faucetlink.to/goerli)

3. Deploy & Verify

-   Testnet:

```
yarn hardhat deploy --network <NETWORK> --tags "main"
```

-   Mainnet:

```
PRIVATE_KEY=<YOUR_PRIVATE_KEY> yarn hardhat deploy --network mainnet --tags "main"
history -c
```


<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[solidity]: https://img.shields.io/badge/Solidity-e6e6e6?style=for-the-badge&logo=solidity&logoColor=black
[solidity-url]: https://docs.soliditylang.org/en/v0.8.17/
[typescript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[openzeppelin]: https://img.shields.io/badge/OpenZeppelin-4E5EE4?logo=OpenZeppelin&logoColor=fff&style=for-the-badge
[openzeppelin-url]: https://docs.openzeppelin.com/
[hardhat]: https://hardhat.org/_next/static/media/hardhat-logo.5c5f687b.svg
[hardhat-url]: https://hardhat.org/
