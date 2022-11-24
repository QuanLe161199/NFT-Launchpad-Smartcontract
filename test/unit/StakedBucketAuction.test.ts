import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import stakedBucketAuctionArguments, { developmentChains } from "../../helper-hardhat-config"
import { network, ethers, deployments } from "hardhat"
import { StakedBucketAuction } from "../../typechain-types/contracts"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Staked Bucket Auction Unit Tests", () => {
          let stakedBucketAuction: StakedBucketAuction
          let accounts: SignerWithAddress[]
          let owner: SignerWithAddress
          let user: SignerWithAddress
          let attacker: SignerWithAddress
          let constructorArguments: any[]
          beforeEach(async () => {
              constructorArguments = await stakedBucketAuctionArguments()

              // gets accounts used to test
              accounts = await ethers.getSigners()
              ;[owner, user, attacker] = accounts

              // deploys the contract
              await deployments.fixture(["staked-bucket-auction"])
              stakedBucketAuction = await ethers.getContract("StakedBucketAuction", owner)
          })

          describe("constructor", () => {
              it("initializers the Staked Bucket Auction contract correctly", async () => {
                  const collectionName = await stakedBucketAuction.name()
                  const collectionSymbol = await stakedBucketAuction.symbol()
                  const mintable = await stakedBucketAuction.getMintable()
                  const tokenURISuffix = await stakedBucketAuction.getTokenURISuffix()
                  const maxMintableSupply = await stakedBucketAuction.getMaxMintableSupply()
                  const globalWalletLimit = await stakedBucketAuction.getGlobalWalletLimit()
                  const cosigner = await stakedBucketAuction.getCosigner()
                  const claimable = await stakedBucketAuction.getClaimable()
                  const minimumContributionInWei =
                      await stakedBucketAuction.getMinimumContributionInWei()
                  const startTimeUnixSeconds = await stakedBucketAuction.getStartTimeUnixSeconds()
                  const endTimeUnixSeconds = await stakedBucketAuction.getEndTimeUnixSeconds()
                  const baseAward = await stakedBucketAuction.baseAward()

                  assert.equal(collectionName, constructorArguments[0])
                  assert.equal(collectionSymbol, constructorArguments[1])
                  assert.equal(mintable, false)
                  assert.equal(tokenURISuffix, constructorArguments[2])
                  assert.equal(maxMintableSupply.toString(), constructorArguments[3])
                  assert.equal(globalWalletLimit.toString(), constructorArguments[4])
                  assert.equal(cosigner, constructorArguments[5])
                  assert.equal(claimable, false)
                  assert.equal(minimumContributionInWei.toString(), constructorArguments[6])
                  assert.equal(startTimeUnixSeconds.toString(), constructorArguments[7])
                  assert.equal(endTimeUnixSeconds.toString(), constructorArguments[8])
                  assert.equal(baseAward.toString(), "0")
              })
          })

          describe("setBaseAward", () => {
              const newBaseAward = 10

              it("reverts when the caller ins't the owner", async () => {
                  await expect(
                      stakedBucketAuction.connect(attacker).setBaseAward(newBaseAward)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("sets base award successfully", async () => {
                  await stakedBucketAuction.setBaseAward(newBaseAward)

                  assert.equal(
                      newBaseAward.toString(),
                      (await stakedBucketAuction.baseAward()).toString()
                  )
              })
          })

          describe("setHandler", () => {
              // CHECK
          })

          describe("setStakeable", () => {
              const stakeable = true

              it("reverts when the caller isn't the owner", async () => {
                  await expect(
                      stakedBucketAuction.connect(attacker).setStakeable(stakeable)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("changes the stakeable successfully", async () => {
                  await stakedBucketAuction.setStakeable(stakeable)

                  assert.equal(stakeable, await stakedBucketAuction.isStakeable())
              })
          })

          describe("After users have tokens", () => {
              let tokenIds: number[]
              const numberOfUsers = 10
              const numberOfTokens = 5
              beforeEach(async () => {
                  const price = ethers.utils.parseEther("1")

                  tokenIds = new Array()
                  for (let i = numberOfTokens; i < numberOfTokens * 2; i++) {
                      tokenIds.push(i)
                  }

                  let addresses = new Array()
                  for (let i = 0; i < numberOfUsers; i++) {
                      addresses.push(accounts[i].address)
                  }

                  // users bidding
                  for (let i = 0; i < numberOfUsers; i++) {
                      await stakedBucketAuction
                          .connect(accounts[i])
                          .bid({ value: price.mul(numberOfTokens).add(price.div(2)) }) // 5 tokens and balance is half a price
                  }

                  // sets the price
                  const blockNumber = await ethers.provider.getBlockNumber()
                  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
                  await stakedBucketAuction.setStartAndEndTimeUnixSeconds(
                      parseInt(((timestamp * 90) / 100).toString()),
                      timestamp.toString()
                  )
                  await stakedBucketAuction.setPrice(price)

                  // the owner sends tokens and bidding balance to the user
                  await stakedBucketAuction.sendTokensAndRefundBatch(addresses)
              })

              describe("claimTokens", () => {
                  const reStake = false

                  it("reverts when the caller didn't enter any token Ids", async () => {
                      const invalidTokenIds: number[] = []
                      await expect(
                          stakedBucketAuction.connect(user).claimTokens(invalidTokenIds, reStake)
                      ).to.be.revertedWith("NoTokensSpecified()")
                  })
                  it("reverts when the caller entered a token he doesn't have", async () => {
                      // if there is someone else's token Id
                      const invalidTokenIds = [5, 6, 7, 8, 9, 10]
                      await expect(
                          stakedBucketAuction.connect(user).claimTokens(invalidTokenIds, reStake)
                      ).to.be.revertedWith("IncorrectOwner()")

                      // if there is token Id doesn't exist
                      const notExistTokenIds = [5, 6, 7, 8, 9, numberOfUsers * numberOfTokens]
                      await expect(
                          stakedBucketAuction.connect(user).claimTokens(notExistTokenIds, reStake)
                      ).to.be.revertedWith("OwnerQueryForNonexistentToken()")
                  })
                  describe("If the tokens are staked for the first time...", () => {
                      it("claims tokens successfully", async () => {
                          await stakedBucketAuction.connect(user).claimTokens(tokenIds, reStake)
                          // CHECK
                      })
                      // CHECK
                  })
              })

              describe("stakeTokens", () => {
                  beforeEach(async () => {
                      await stakedBucketAuction.setStakeable(true)
                  })

                  it("reverts when the caller didn't enter any token Ids", async () => {
                      const invalidTokenIds: number[] = []
                      await expect(
                          stakedBucketAuction.connect(user).stakeTokens(invalidTokenIds)
                      ).to.be.revertedWith("NoTokensSpecified()")
                  })
                  it("reverts when the isStakeable state is false", async () => {
                      // changes the isStakeable state to false
                      await stakedBucketAuction.setStakeable(false)

                      await expect(
                          stakedBucketAuction.connect(user).stakeTokens(tokenIds)
                      ).to.be.revertedWith("StakingInactive()")
                  })
                  it("reverts when the caller entered a token he doesn't have", async () => {
                      // if there is someone else's token Id
                      const invalidTokenIds = [5, 6, 7, 8, 9, 10]
                      await expect(
                          stakedBucketAuction.connect(user).stakeTokens(invalidTokenIds)
                      ).to.be.revertedWith("IncorrectOwner()")

                      // if there is token Id doesn't exist
                      const notExistTokenIds = [5, 6, 7, 8, 9, numberOfUsers * numberOfTokens]
                      await expect(
                          stakedBucketAuction.connect(user).stakeTokens(notExistTokenIds)
                      ).to.be.revertedWith("OwnerQueryForNonexistentToken()")
                  })
                  it("emits events after staking tokens", async () => {
                      await expect(stakedBucketAuction.connect(user).stakeTokens(tokenIds)).to.emit(
                          stakedBucketAuction,
                          "TokenStaked"
                      )
                  })
                  it("stakes tokens successfully", async () => {
                      const txResponse = await stakedBucketAuction
                          .connect(user)
                          .stakeTokens(tokenIds)
                      const transactionReceipt = await txResponse.wait(1)

                      // checks the emitted information of the event
                      for (let i = 0; i < numberOfTokens; i++) {
                          assert.equal(
                              tokenIds[i].toString(),
                              transactionReceipt.events![i].args!.tokenId
                          )
                          assert.equal(
                              (await stakedBucketAuction.stakes(tokenIds[i]))[0].toString(),
                              transactionReceipt.events![i].args!.timestamp.toString()
                          )
                      }

                      // checks state variables of the contract
                      for (let i = 0; i < numberOfTokens; i++) {
                          if (i == 0) {
                              assert(Number((await stakedBucketAuction.stakes(tokenIds[i]))[0]) > 0)
                          } else {
                              assert.equal(
                                  Number((await stakedBucketAuction.stakes(tokenIds[i]))[0]),
                                  Number((await stakedBucketAuction.stakes(tokenIds[i - 1]))[0])
                              )
                          }
                      }
                  })
                  describe("interactions", () => {
                      // CHECK
                  })
              })

              describe("transferFrom: only checks the overridden parts", () => {
                  beforeEach(async () => {
                      await stakedBucketAuction.setStakeable(true)
                  })

                  it("revert when the input token is being staked", async () => {
                      // stakes tokens
                      let tokenIdsAttacker = [10, 11, 12, 13, 14]
                      await stakedBucketAuction.connect(attacker).stakeTokens(tokenIdsAttacker)

                      await expect(
                          stakedBucketAuction
                              .connect(attacker)
                              .transferFrom(attacker.address, user.address, tokenIdsAttacker[0])
                      ).to.be.revertedWith("TransferWhileStaked()")
                  })
              })
          })
      })
