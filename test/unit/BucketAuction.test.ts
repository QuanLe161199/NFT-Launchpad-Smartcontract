import { assert, expect } from "chai"
import { BucketAuction } from "./../../typechain-types/contracts/BucketAuction"
import { developmentChains } from "../../helper-hardhat-config"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import bucketAuctionArguments from "../../helper-hardhat-config"
import { network, deployments, ethers } from "hardhat"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Bucket Auction Unit Tests", () => {
          let bucketAuction: BucketAuction
          let accounts: SignerWithAddress[]
          let owner: SignerWithAddress
          let attacker: SignerWithAddress
          let user: SignerWithAddress
          let constructorArguments: any[]
          beforeEach(async () => {
              constructorArguments = await bucketAuctionArguments()

              // gets accounts used to test
              accounts = await ethers.getSigners()
              ;[owner, user, attacker] = accounts

              // deploys the contract
              await deployments.fixture(["bucket-auction"])
              bucketAuction = await ethers.getContract("BucketAuction", owner)
          })

          describe("constructor", () => {
              it("initializers the Bucket Auction correctly", async () => {
                  const collectionName = await bucketAuction.name()
                  const collectionSymbol = await bucketAuction.symbol()
                  const mintable = await bucketAuction.getMintable()
                  const tokenURISuffix = await bucketAuction.getTokenURISuffix()
                  const maxMintableSupply = await bucketAuction.getMaxMintableSupply()
                  const globalWalletLimit = await bucketAuction.getGlobalWalletLimit()
                  const cosigner = await bucketAuction.getCosigner()
                  const claimable = await bucketAuction.getClaimable()
                  const minimumContributionInWei = await bucketAuction.getMinimumContributionInWei()
                  const startTimeUnixSeconds = await bucketAuction.getStartTimeUnixSeconds()
                  const endTimeUnixSeconds = await bucketAuction.getEndTimeUnixSeconds()

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
              })
          })

          describe("setClaimable", () => {
              let newClaimable = true
              it("reverts when the caller isn't the owner", async () => {
                  await expect(
                      bucketAuction.connect(attacker).setClaimable(newClaimable)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("emits an event after changing the claimable state", async () => {
                  await expect(bucketAuction.setClaimable(newClaimable)).to.emit(
                      bucketAuction,
                      "SetClaimable"
                  )
              })
              it("changes the claimable state successfully", async () => {
                  const txResponse = await bucketAuction.setClaimable(newClaimable)

                  // checks the emitted information of the event
                  const transactionReceipt = await txResponse.wait(1)
                  const setClaimableEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args
                  assert.equal(newClaimable, setClaimableEvent!.claimable)

                  // checks state variables of the contract
                  assert.equal(newClaimable, await bucketAuction.getClaimable())
              })
          })

          describe("setStartAndEndTimeUnixSeconds", () => {
              let startTime: number, endTime: number
              beforeEach(async () => {
                  const blockNumber = await ethers.provider.getBlockNumber()
                  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
                  startTime = timestamp
                  endTime = parseInt(((timestamp * 110) / 100).toString())
              })

              it("reverts when the caller isn't the owner", async () => {
                  await expect(
                      bucketAuction
                          .connect(attacker)
                          .setStartAndEndTimeUnixSeconds(startTime, endTime)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("reverts when the start time is greater or equal to the end time", async () => {
                  const invalidStartTime = endTime
                  const invalidEndTime = startTime
                  await expect(
                      bucketAuction.setStartAndEndTimeUnixSeconds(invalidStartTime, invalidEndTime)
                  ).to.be.revertedWith("InvalidStartAndEndTimestamp()")
              })
              it("changes the start time and the end time successfully", async () => {
                  await bucketAuction.setStartAndEndTimeUnixSeconds(startTime, endTime)

                  assert.equal(
                      startTime.toString(),
                      (await bucketAuction.getStartTimeUnixSeconds()).toString()
                  )
                  assert.equal(
                      endTime.toString(),
                      (await bucketAuction.getEndTimeUnixSeconds()).toString()
                  )
              })
              it("reverts when the price has been set", async () => {
                  // sets the price
                  const startTimeToSetPrice = parseInt(((startTime * 90) / 100).toString())
                  const endTimeToSetPrice = startTime
                  await bucketAuction.setStartAndEndTimeUnixSeconds(
                      startTimeToSetPrice,
                      endTimeToSetPrice
                  )
                  const price = ethers.utils.parseEther("1")
                  await bucketAuction.setPrice(price)

                  // reverts when the price has been set
                  await expect(
                      bucketAuction.setStartAndEndTimeUnixSeconds(startTime, endTime)
                  ).to.be.revertedWith("PriceHasBeenSet()")
              })
          })

          describe("bid", async () => {
              const bid = ethers.utils.parseEther("1")

              it("reverts when it's not time for the auction", async () => {
                  // changes the time of the auction
                  const blockNumber = await ethers.provider.getBlockNumber()
                  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
                  const newStartTime = parseInt(((timestamp * 110) / 100).toString()).toString()
                  const newEndTime = parseInt(((timestamp * 120) / 100).toString()).toString()
                  await bucketAuction.setStartAndEndTimeUnixSeconds(newStartTime, newEndTime)

                  await expect(bucketAuction.connect(user).bid({ value: bid })).to.be.revertedWith(
                      "BucketAuctionNotActive()"
                  )
              })
              it("reverts when this bid is lower than the minimum bid", async () => {
                  const minimumBid = await bucketAuction.getMinimumContributionInWei()
                  const invalidBid = minimumBid.sub(1)

                  await expect(
                      bucketAuction.connect(user).bid({ value: invalidBid })
                  ).to.be.revertedWith("LowerThanMinBidAmount()")
              })
              it("emits an event after bidding", async () => {
                  await expect(bucketAuction.connect(user).bid({ value: bid })).to.emit(
                      bucketAuction,
                      "Bid"
                  )
              })
              it("bids successfully", async () => {
                  const txResponse = await bucketAuction.connect(user).bid({ value: bid })

                  // checks the emitted information of the event
                  const transactionReceipt = await txResponse.wait(1)
                  const bidEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args
                  assert.equal(bidEvent!.bidder, user.address)
                  assert.equal(bidEvent!.bidAmount.toString(), bid.toString())
                  assert.equal(bidEvent!.bidderTotal.toString(), bid.toString())
                  assert.equal(bidEvent!.bucketTotal.toString(), bid.toString())

                  // checks state variables of the contract
                  assert.equal((await bucketAuction.getTotalUsers()).toString(), "1")
                  assert.equal(
                      (await bucketAuction.getUserData(user.address))[0].toString(),
                      bid.toString()
                  )
                  assert.equal(
                      (await ethers.provider.getBalance(bucketAuction.address)).toString(),
                      bid.toString()
                  )
              })
          })

          describe("setMinimumContribution", () => {
              const newMinimumContribution = "1000000000000000"

              it("reverts when the caller isn't the owner", async () => {
                  await expect(
                      bucketAuction.connect(attacker).setMinimumContribution(newMinimumContribution)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("emits an event after changing the minimum contribution", async () => {
                  await expect(
                      bucketAuction.setMinimumContribution(newMinimumContribution)
                  ).to.emit(bucketAuction, "SetMinimumContribution")
              })
              it("changes the minimum contribution successfully", async () => {
                  const txResponse = await bucketAuction.setMinimumContribution(
                      newMinimumContribution
                  )

                  // checks the emitted information of the event
                  const transactionReceipt = await txResponse.wait(1)
                  const setMinimumContributionEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args
                  assert.equal(
                      setMinimumContributionEvent!.minimumContributionInWei.toString(),
                      newMinimumContribution
                  )

                  // checks state variables of the contract
                  assert.equal(
                      (await bucketAuction.getMinimumContributionInWei()).toString(),
                      newMinimumContribution
                  )
              })
          })

          describe("setPrice", () => {
              const price = ethers.utils.parseEther("1")
              beforeEach(async () => {
                  // user bids
                  await bucketAuction.connect(user).bid({ value: price })

                  const blockNumber = await ethers.provider.getBlockNumber()
                  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
                  const startTimeToSetPrice = parseInt(((timestamp * 90) / 100).toString())
                  const endTimeToSetPrice = timestamp
                  await bucketAuction.setStartAndEndTimeUnixSeconds(
                      startTimeToSetPrice,
                      endTimeToSetPrice
                  )
              })

              it("reverts when the caller isn't the owner", async () => {
                  await expect(bucketAuction.connect(attacker).setPrice(price)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("reverts when in claimable state", async () => {
                  // sets claimable state to true
                  await bucketAuction.setClaimable(true)

                  await expect(bucketAuction.setPrice(price)).to.be.revertedWith(
                      "CannotSetPriceIfClaimable()"
                  )
              })
              it("reverts when in auction state", async () => {
                  // sets the start time and the end time
                  const blockNumber = await ethers.provider.getBlockNumber()
                  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
                  const startTime = parseInt(((timestamp * 90) / 100).toString())
                  const endTime = parseInt(((timestamp * 110) / 100).toString())
                  await bucketAuction.setStartAndEndTimeUnixSeconds(startTime, endTime)

                  await expect(bucketAuction.setPrice(price)).to.be.revertedWith(
                      "BucketAuctionActive()"
                  )
              })
              it("emits an event after setting the price", async () => {
                  await expect(bucketAuction.setPrice(price)).to.emit(bucketAuction, "SetPrice")
              })
              it("sets price successfully", async () => {
                  const txResponse = await bucketAuction.setPrice(price)

                  // checks the emitted information of the event
                  const transactionReceipt = await txResponse.wait(1)
                  const setPriceEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args
                  assert.equal(setPriceEvent!.price.toString(), price.toString())

                  // checks state variables of the contract
                  assert.equal((await bucketAuction.getPrice()).toString(), price.toString())
              })
              it("reverts when the first token has been sent", async () => {
                  // successfully sets the price first
                  await bucketAuction.setPrice(price)

                  // sends the first token
                  await bucketAuction.sendTokens(user.address, 1)

                  // failed sets the price second
                  const newPrice = ethers.utils.parseEther("1.5")
                  await expect(bucketAuction.setPrice(newPrice)).to.be.revertedWith(
                      "CannotSetPriceIfFirstTokenSent()"
                  )
              })
          })

          describe("After setting the price and users bidding...", async () => {
              const numberOfTokens = 5
              const numberOfUsers = 10
              const price = ethers.utils.parseEther("1")
              let addresses: string[]
              beforeEach(async () => {
                  addresses = new Array()
                  for (let i = 0; i < numberOfUsers; i++) {
                      addresses.push(accounts[i].address)
                  }

                  // users bidding
                  for (let i = 0; i < numberOfUsers; i++) {
                      await bucketAuction
                          .connect(accounts[i])
                          .bid({ value: price.mul(numberOfTokens).add(price.div(2)) }) // 5 tokens and balance is half a price
                  }

                  // sets the price
                  const blockNumber = await ethers.provider.getBlockNumber()
                  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp
                  await bucketAuction.setStartAndEndTimeUnixSeconds(
                      parseInt(((timestamp * 90) / 100).toString()),
                      timestamp.toString()
                  )
                  await bucketAuction.setPrice(price)
              })

              describe("sendTokens", () => {
                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          bucketAuction
                              .connect(attacker)
                              .sendTokens(attacker.address, numberOfTokens)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the price hasn't been set", async () => {
                      // sets the price to zero
                      await bucketAuction.setPrice(0)

                      await expect(
                          bucketAuction.sendTokens(user.address, numberOfTokens)
                      ).to.be.revertedWith("PriceNotSet()")
                  })
                  it("reverts when the token sent exceeds the user's bid", async () => {
                      const exceedTokens = numberOfTokens + 1
                      await expect(
                          bucketAuction.sendTokens(user.address, exceedTokens)
                      ).to.be.revertedWith("CannotSendMoreThanUserPurchased()")
                  })
                  it("reverts when the number of tokens exceeds the maximum mintable supply", async () => {
                      // sets the maximum mintable supply
                      await bucketAuction.setMaxMintableSupply(numberOfTokens - 1)

                      await expect(
                          bucketAuction.sendTokens(user.address, numberOfTokens)
                      ).to.be.revertedWith("NoSupplyLeft()")
                  })
                  it("sends tokens successfully", async () => {
                      await bucketAuction.sendTokens(user.address, numberOfTokens)

                      assert.equal(
                          (await bucketAuction.getUserData(user.address))[1].toString(),
                          numberOfTokens.toString()
                      )
                      for (let i = 0; i < numberOfTokens; i++) {
                          assert.equal(await bucketAuction.ownerOf(i), user.address)
                      }
                  })
              })

              describe("sendAllTokens: same as sendTokens but the amount of tokens has been calculated", async () => {
                  it("sends all tokens successfully", async () => {
                      await bucketAuction.sendAllTokens(user.address)

                      assert.equal(
                          (await bucketAuction.getUserData(user.address))[1].toString(),
                          numberOfTokens.toString()
                      )
                      for (let i = 0; i < numberOfTokens; i++) {
                          assert.equal(await bucketAuction.ownerOf(i), user.address)
                      }
                  })
              })

              describe("sendRefund", async () => {
                  it("reverts when the user isn't the caller", async () => {
                      await expect(
                          bucketAuction.connect(attacker).sendRefund(attacker.address)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the price hasn't been set", async () => {
                      // sets the price to zero
                      await bucketAuction.setPrice(0)

                      await expect(bucketAuction.sendRefund(user.address)).to.be.revertedWith(
                          "PriceNotSet()"
                      )
                  })
                  it("sends refund to user successfully", async () => {
                      const userBalance = await ethers.provider.getBalance(user.address)

                      await bucketAuction.sendRefund(user.address)

                      const refundValue = (await bucketAuction.getUserData(user.address))[0].mod(
                          price
                      )

                      const newUserBalance = await ethers.provider.getBalance(user.address)

                      assert.equal((await bucketAuction.getUserData(user.address))[2], true)
                      assert.equal(
                          newUserBalance.toString(),
                          userBalance.add(refundValue).toString()
                      )
                  })
                  it("reverts when a refund has been sent to the user before", async () => {
                      // successfully sends refund to user first
                      await bucketAuction.sendRefund(user.address)

                      // failed sends refund to user second
                      await expect(bucketAuction.sendRefund(user.address)).to.be.revertedWith(
                          "UserAlreadyClaimed()"
                      )
                  })
              })

              describe("sendRefundBatch", async () => {
                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          bucketAuction.connect(attacker).sendRefundBatch(addresses)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("sends refund batch successfully", async () => {
                      let userBalances = new Array()
                      for (let i = 0; i < numberOfUsers; i++) {
                          userBalances.push(await ethers.provider.getBalance(accounts[i].address))
                      }

                      const txResponse = await bucketAuction.sendRefundBatch(addresses)
                      const transactionReceipt = await txResponse.wait(1)
                      const gasCost = transactionReceipt.gasUsed.mul(
                          transactionReceipt.effectiveGasPrice
                      )

                      for (let i = 0; i < numberOfUsers; i++) {
                          const refundValue = (
                              await bucketAuction.getUserData(accounts[i].address)
                          )[0].mod(price)
                          const newUserBalance = await ethers.provider.getBalance(
                              accounts[i].address
                          )

                          assert.equal(
                              (await bucketAuction.getUserData(accounts[i].address))[2],
                              true
                          )
                          if (i == 0) {
                              assert.equal(
                                  newUserBalance.toString(),
                                  userBalances[i].sub(gasCost).add(refundValue).toString()
                              )
                          } else {
                              assert.equal(
                                  newUserBalance.toString(),
                                  userBalances[i].add(refundValue).toString()
                              )
                          }
                      }
                  })
              })

              describe("sendTokensBatch: doesn't double check the _sendTokens method", async () => {
                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          bucketAuction.connect(attacker).sendTokensBatch(addresses)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("sends tokens batch successfully", async () => {
                      await bucketAuction.sendTokensBatch(addresses)

                      for (let i = 0; i < numberOfUsers; i++) {
                          assert.equal(
                              (await bucketAuction.getUserData(accounts[i].address))[1].toString(),
                              numberOfTokens.toString()
                          )
                          for (let j = 0; j < numberOfTokens; j++) {
                              assert.equal(
                                  await bucketAuction.ownerOf(i * numberOfTokens + j),
                                  accounts[i].address
                              )
                          }
                      }
                  })
              })

              describe("sendTokensAndRefund", () => {
                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          bucketAuction.connect(attacker).sendTokensAndRefund(attacker.address)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the price hasn't been set", async () => {
                      // set the price to zero
                      await bucketAuction.setPrice(0)

                      await expect(
                          bucketAuction.sendTokensAndRefund(user.address)
                      ).to.be.revertedWith("PriceNotSet()")
                  })
                  it("reverts when the user has received the tokens", async () => {})
                  it("reverts when the user has received the bidding balance", async () => {
                      // sends a token to user
                      await bucketAuction.sendTokens(user.address, 1)

                      await expect(
                          bucketAuction.sendTokensAndRefund(user.address)
                      ).to.be.revertedWith("AlreadySentTokensToUser()")
                  })
              })
          })
      })
