import { ethers } from "hardhat"

const bucketAuctionArguments = async () => {
    const blockNumber = await ethers.provider.getBlockNumber()
    const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
    const startTimeUnixSeconds = timestamp.toString()
    const endTimeUnixSeconds = parseInt(((timestamp * 110) / 100).toString()).toString()

    return [
        "Azuki",
        "AZUKI",
        ".json",
        "10000",
        "5",
        "0x0000000000000000000000000000000000000000",
        "40000000000000000",
        startTimeUnixSeconds,
        endTimeUnixSeconds,
    ]
}

export const erc721IArguments = [
    "Azuki",
    "AZUKI",
    ".json",
    "10000",
    "5",
    "0x0000000000000000000000000000000000000000",
]
export default bucketAuctionArguments
export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
