import { assert, expect } from "chai"
import { ERC721I } from "./../../typechain-types/contracts/ERC721I"
import { constructorArguments, developmentChains } from "../../helper-hardhat-config"
import { network, deployments, ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import merkleTree from "../../utils/merkleTree"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("ERC721I Unit Tests", () => {
          let erc721I: ERC721I
          let accounts: SignerWithAddress[]
          let whitelistAddresses: string[] = new Array(10)
          let deployer: SignerWithAddress
          let attacker: SignerWithAddress
          let user: SignerWithAddress
          let cosigner: SignerWithAddress
          let crossmintAccount: SignerWithAddress
          beforeEach(async () => {
              // gets accounts used to test
              accounts = await ethers.getSigners()
              for (let i = 0; i < whitelistAddresses.length; i++) {
                  whitelistAddresses[i] = accounts[i].address
              }
              deployer = accounts[0]
              attacker = accounts[1]
              user = accounts[2]
              cosigner = accounts[3]
              crossmintAccount = accounts[4]

              // deploys the contract
              await deployments.fixture(["erc721i"])
              erc721I = await ethers.getContract("ERC721I", deployer)
          })

          describe("constructor", () => {
              it("initializers the miaswap correctly", async () => {
                  const collectionName = await erc721I.name()
                  const collectionSymbol = await erc721I.symbol()
                  const mintable = await erc721I.getMintable()
                  const tokenURISuffix = await erc721I.getTokenURISuffix()
                  const maxMintableSupply = await erc721I.getMaxMintableSupply()
                  const globalWalletLimit = await erc721I.getGlobalWalletLimit()
                  const cosigner = await erc721I.getCosigner()

                  assert.equal(collectionName, constructorArguments[0])
                  assert.equal(collectionSymbol, constructorArguments[1])
                  assert.equal(mintable, false)
                  assert.equal(tokenURISuffix, constructorArguments[2])
                  assert.equal(maxMintableSupply.toString(), constructorArguments[3])
                  assert.equal(globalWalletLimit.toString(), constructorArguments[4])
                  assert.equal(cosigner, constructorArguments[5])
              })
          })

          describe("setCosigner", () => {
              let newCosignerAddress: string
              beforeEach(() => {
                  newCosignerAddress = accounts[10].address
              })
              it("reverts when the caller isn't the owner", async () => {
                  await expect(
                      erc721I.connect(attacker).setCosigner(attacker.address)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("emits an event after changing the cosigner", async () => {
                  await expect(erc721I.setCosigner(newCosignerAddress)).to.emit(
                      erc721I,
                      "SetCosigner"
                  )
              })
              it("changes the cosigner successfully", async () => {
                  const txResponse = await erc721I.setCosigner(newCosignerAddress)

                  // checks the emitted information of the event
                  const transactionReceipt = await txResponse.wait(1)
                  const setCosignerEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args
                  assert.equal(newCosignerAddress, setCosignerEvent!.cosigner)

                  // checks state variables of the contract
                  assert.equal(newCosignerAddress, await erc721I.getCosigner())
              })
          })

          describe("setCrossmintAddress", () => {
              let newCrossmintAddress: string
              beforeEach(() => {
                  newCrossmintAddress = accounts[10].address
              })
              it("reverts when the caller isn't the owner", async () => {
                  await expect(
                      erc721I.connect(attacker).setCrossmintAddress(attacker.address)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("emits an event after changing the crossmint address", async () => {
                  await expect(erc721I.setCrossmintAddress(newCrossmintAddress)).to.emit(
                      erc721I,
                      "SetCrossmintAddress"
                  )
              })
              it("changes the crossmint address successfully", async () => {
                  const txResponse = await erc721I.setCrossmintAddress(newCrossmintAddress)

                  // checks the emitted information of the event
                  const transactionReceipt = await txResponse.wait(1)
                  const setCrossmintAddressEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args
                  assert.equal(newCrossmintAddress, setCrossmintAddressEvent!.crossmintAddress)

                  // checks state variables of the contract
                  assert.equal(newCrossmintAddress, await erc721I.getCrossmintAddress())
              })
          })

          describe("setStages", () => {
              let rootHash: string
              let newStages: any[]
              beforeEach(() => {
                  rootHash = merkleTree(whitelistAddresses, user.address).rootHash
                  newStages = [
                      [ethers.utils.parseEther("1"), 2, rootHash, 0, 5, 10],
                      [ethers.utils.parseEther("1"), 2, rootHash, 0, 70, 75],
                  ]
              })

              it("reverts when the caller isn't the owner", async () => {
                  await expect(erc721I.connect(attacker).setStages(newStages)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("reverts when input contains invalid timestamps", async () => {
                  const insufficientStageTimeGapStages: any[] = [
                      [ethers.utils.parseEther("1"), 2, rootHash, 0, 5, 10],
                      [ethers.utils.parseEther("1"), 2, rootHash, 0, 15, 20],
                  ]
                  await expect(
                      erc721I.setStages(insufficientStageTimeGapStages)
                  ).to.be.revertedWith("InsufficientStageTimeGap()")

                  const invalidStartAndEndTimestampStages: any[] = [
                      [ethers.utils.parseEther("1"), 2, rootHash, 0, 5, 10],
                      [ethers.utils.parseEther("1"), 2, rootHash, 0, 70, 60],
                  ]
                  await expect(
                      erc721I.setStages(invalidStartAndEndTimestampStages)
                  ).to.be.revertedWith("InvalidStartAndEndTimestamp()")
              })
              it("emits events after changing stages", async () => {
                  await expect(erc721I.setStages(newStages)).to.emit(erc721I, "UpdateStage")
              })
              it("changes stages successfully", async () => {
                  const txResponse = await erc721I.setStages(newStages)
                  const transactionReceipt = await txResponse.wait(1)

                  // checks the emitted information of the event
                  for (let i = 0; i < newStages.length; i++) {
                      const stageEvent = transactionReceipt.events![i].args
                      assert.equal(i.toString(), stageEvent!.stage.toString())
                      assert.equal(newStages[i][0].toString(), stageEvent!.price.toString())
                      assert.equal(newStages[i][1].toString(), stageEvent!.walletLimit.toString())
                      assert.equal(newStages[i][2], stageEvent!.merkleRoot)
                      assert.equal(
                          newStages[i][3].toString(),
                          stageEvent!.maxStageSupply.toString()
                      )
                      assert.equal(
                          newStages[i][4].toString(),
                          stageEvent!.startTimeUnixSeconds.toString()
                      )
                      assert.equal(
                          newStages[i][5].toString(),
                          stageEvent!.endTimeUnixSeconds.toString()
                      )
                  }

                  // checks state variables of the contract
                  for (let i = 0; i < newStages.length; i++) {
                      const stage = (await erc721I.getStageInfo(i))[0]
                      assert.equal(newStages[i][0].toString(), stage[0].toString())
                      assert.equal(newStages[i][1].toString(), stage[1].toString())
                      assert.equal(newStages[i][2].toString(), stage[2].toString())
                      assert.equal(newStages[i][3].toString(), stage[3].toString())
                      assert.equal(newStages[i][4].toString(), stage[4].toString())
                      assert.equal(newStages[i][5].toString(), stage[5].toString())
                  }
              })
          })

          describe("After sets the stages...", () => {
              let rootHash: string
              let stages: any[]
              beforeEach(async () => {
                  rootHash = merkleTree(whitelistAddresses, accounts[0].address).rootHash
                  stages = [
                      [
                          ethers.utils.parseEther("1"),
                          2,
                          rootHash,
                          (Number(constructorArguments[3]) * 20) / 100,
                          0,
                          10,
                      ],
                      [
                          ethers.utils.parseEther("1"),
                          2,
                          rootHash,
                          (Number(constructorArguments[3]) * 80) / 100,
                          70,
                          75,
                      ],
                  ]

                  await erc721I.setStages(stages)
              })

              describe("setMintable", () => {
                  const mintable = true

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setMintable(mintable)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("emits an event after changing mintable state", async () => {
                      await expect(erc721I.setMintable(mintable)).to.emit(erc721I, "SetMintable")
                  })
                  it("changes mintable state successfully", async () => {
                      const txResponse = await erc721I.setMintable(mintable)

                      // checks the emitted information of the event
                      const transactionReceipt = await txResponse.wait(1)
                      const setMintableEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(mintable, setMintableEvent!.mintable)

                      // checks state variables of the contract
                      assert.equal(mintable, await erc721I.getMintable())
                  })
              })

              describe("setMaxMintableSupply", () => {
                  let newMaxMintableSupply: number
                  beforeEach(() => {
                      newMaxMintableSupply = (Number(constructorArguments[3]) * 90) / 100
                  })

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setMaxMintableSupply(newMaxMintableSupply)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the new index is greater than the old index", async () => {
                      const invalidMintableSupply = Number(constructorArguments[3]) + 1
                      await expect(
                          erc721I.setMaxMintableSupply(invalidMintableSupply)
                      ).to.be.revertedWith("CannotIncreaseMaxMintableSupply()")
                  })
                  it("emits an event after changing max mintable supply index", async () => {
                      await expect(erc721I.setMaxMintableSupply(newMaxMintableSupply)).to.emit(
                          erc721I,
                          "SetMaxMintableSupply"
                      )
                  })
                  it("changes mintable supply index successfully", async () => {
                      const txResponse = await erc721I.setMaxMintableSupply(newMaxMintableSupply)

                      // checks the emitted information of the event
                      const transactionReceipt = await txResponse.wait(1)
                      const setMaxMintableSupplyEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(
                          newMaxMintableSupply.toString(),
                          setMaxMintableSupplyEvent!.maxMintableSupply
                      )

                      // checks state variables of the contract
                      assert.equal(
                          newMaxMintableSupply.toString(),
                          (await erc721I.getMaxMintableSupply()).toString()
                      )
                  })
              })

              describe("setGlobalWalletLimit", () => {
                  let newGlobalWalletLimit: number
                  beforeEach(() => {
                      newGlobalWalletLimit = Number(constructorArguments[4]) + 1
                  })

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setGlobalWalletLimit(newGlobalWalletLimit)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when new global wallet limit index is greater than max mintable supply index", async () => {
                      const invalidGlobalWalletLimit = Number(constructorArguments[3]) + 1
                      await expect(
                          erc721I.setGlobalWalletLimit(invalidGlobalWalletLimit)
                      ).to.be.revertedWith("GlobalWalletLimitOverflow()")
                  })
                  it("emits an event after changing global wallet limit index", async () => {
                      await expect(erc721I.setGlobalWalletLimit(newGlobalWalletLimit)).to.emit(
                          erc721I,
                          "SetGlobalWalletLimit"
                      )
                  })
                  it("changes global wallet limit index successfully", async () => {
                      const txResponse = await erc721I.setGlobalWalletLimit(newGlobalWalletLimit)

                      // checks the emitted information of the event
                      const transactionReceipt = await txResponse.wait(1)
                      const setGlobalWalletLimitEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(
                          newGlobalWalletLimit.toString(),
                          setGlobalWalletLimitEvent!.globalWalletLimit.toString()
                      )

                      // checks state variables of the contract
                      assert.equal(
                          newGlobalWalletLimit.toString(),
                          (await erc721I.getGlobalWalletLimit()).toString()
                      )
                  })
              })

              describe("setActiveStage", () => {
                  const newActiveStage = 1

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setActiveStage(newActiveStage)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the new active stage is invalid", async () => {
                      const invalidStage = stages.length
                      await expect(erc721I.setActiveStage(invalidStage)).to.be.revertedWith(
                          "InvalidStage()"
                      )
                  })
                  it("emits an event after changing active stage", async () => {
                      await expect(erc721I.setActiveStage(newActiveStage)).to.emit(
                          erc721I,
                          "SetActiveStage"
                      )
                  })
              })

              describe("updateStage", () => {
                  let newStage: any[]
                  beforeEach(() => {
                      newStage = [1, ethers.utils.parseEther("2"), 3, rootHash, 5, 80, 85]
                  })

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I
                              .connect(attacker)
                              .updateStage(
                                  newStage[0],
                                  newStage[1],
                                  newStage[2],
                                  newStage[3],
                                  newStage[4],
                                  newStage[5],
                                  newStage[6]
                              )
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the index of stage is invalid", async () => {
                      const invalidStage: any[] = [
                          stages.length,
                          ethers.utils.parseEther("2"),
                          3,
                          rootHash,
                          5,
                          0,
                          5,
                      ]

                      await expect(
                          erc721I.updateStage(
                              invalidStage[0],
                              invalidStage[1],
                              invalidStage[2],
                              invalidStage[3],
                              invalidStage[4],
                              invalidStage[5],
                              invalidStage[6]
                          )
                      ).to.be.revertedWith("InvalidStage()")
                  })
                  it("reverts when start time argument are invalid", async () => {
                      const invalidStage: any[] = [
                          1,
                          ethers.utils.parseEther("2"),
                          3,
                          rootHash,
                          5,
                          0,
                          5,
                      ]
                      await expect(
                          erc721I.updateStage(
                              invalidStage[0],
                              invalidStage[1],
                              invalidStage[2],
                              invalidStage[3],
                              invalidStage[4],
                              invalidStage[5],
                              invalidStage[6]
                          )
                      ).to.be.revertedWith("InsufficientStageTimeGap()")
                  })
                  it("reverts when end time argument are invalid", async () => {
                      const invalidStage: any[] = [
                          1,
                          ethers.utils.parseEther("2"),
                          3,
                          rootHash,
                          5,
                          70,
                          60,
                      ]
                      await expect(
                          erc721I.updateStage(
                              invalidStage[0],
                              invalidStage[1],
                              invalidStage[2],
                              invalidStage[3],
                              invalidStage[4],
                              invalidStage[5],
                              invalidStage[6]
                          )
                      ).to.be.revertedWith("InvalidStartAndEndTimestamp()")
                  })
                  it("emits an event after updating the target stage", async () => {
                      await expect(
                          erc721I.updateStage(
                              newStage[0],
                              newStage[1],
                              newStage[2],
                              newStage[3],
                              newStage[4],
                              newStage[5],
                              newStage[6]
                          )
                      ).to.emit(erc721I, "UpdateStage")
                  })
                  it("updates the target stage successfully", async () => {
                      const txResponse = await erc721I.updateStage(
                          newStage[0],
                          newStage[1],
                          newStage[2],
                          newStage[3],
                          newStage[4],
                          newStage[5],
                          newStage[6]
                      )

                      // checks the emitted information of the event
                      const transactionReceipt = await txResponse.wait(1)
                      const updateStageEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(newStage[0].toString(), updateStageEvent![0].toString())
                      assert.equal(newStage[1].toString(), updateStageEvent![1].toString())
                      assert.equal(newStage[2].toString(), updateStageEvent![2].toString())
                      assert.equal(newStage[3].toString(), updateStageEvent![3].toString())
                      assert.equal(newStage[4].toString(), updateStageEvent![4].toString())
                      assert.equal(newStage[5].toString(), updateStageEvent![5].toString())
                      assert.equal(newStage[6].toString(), updateStageEvent![6].toString())

                      // checks state variables of the contract
                      const stageInfo = (await erc721I.getStageInfo(newStage[0]))[0]
                      assert.equal(newStage[1].toString(), stageInfo![0].toString())
                      assert.equal(newStage[2].toString(), stageInfo![1].toString())
                      assert.equal(newStage[3].toString(), stageInfo![2].toString())
                      assert.equal(newStage[4].toString(), stageInfo![3].toString())
                      assert.equal(newStage[5].toString(), stageInfo![4].toString())
                      assert.equal(newStage[6].toString(), stageInfo![5].toString())
                  })
              })

              describe("mint", () => {
                  let hexProof: string[]
                  let mintArguments: any[]
                  let value: BigNumber
                  beforeEach(async () => {
                      hexProof = merkleTree(whitelistAddresses, user.address).hexProof
                      mintArguments = [
                          (await erc721I.getStageInfo(0))[0][1],
                          hexProof,
                          10,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
                      ]
                      const price = (await erc721I.getStageInfo(0))[0][0]
                      value = price.mul(mintArguments[0])

                      // set mintable state is true
                      await erc721I.setMintable(true)
                  })

                  it("reverts when mintable state is false", async () => {
                      // set mintable state is false
                      await erc721I.setMintable(false)
                      await expect(
                          erc721I
                              .connect(user)
                              .mint(
                                  mintArguments[0],
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3]
                              )
                      ).to.be.revertedWith("NotMintable()")
                  })
                  it("reverts when amount of NFTs after minting exceeds the total supply", async () => {
                      await erc721I.setMaxMintableSupply(11)
                      for (let i = 0; i < 5; i++) {
                          await erc721I
                              .connect(accounts[i])
                              .mint(
                                  mintArguments[0],
                                  merkleTree(whitelistAddresses, accounts[i].address).hexProof,
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value }
                              )
                      }
                      await expect(
                          erc721I
                              .connect(accounts[5])
                              .mint(
                                  mintArguments[0],
                                  merkleTree(whitelistAddresses, accounts[5].address).hexProof,
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value }
                              )
                      ).to.be.revertedWith("NoSupplyLeft()")
                  })
                  it("reverts when active stage is invalid", async () => {
                      await erc721I.setActiveStage(stages.length - 1)
                      await erc721I.setStages(stages.slice(0, 1))
                      await expect(
                          erc721I
                              .connect(user)
                              .mint(
                                  mintArguments[0],
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3]
                              )
                      ).to.be.revertedWith("InvalidStage()")
                  })
                  describe("If the smart contract has cosigner...", () => {
                      beforeEach(async () => {
                          await erc721I.setCosigner(cosigner.address)
                      })
                      /// CHECK
                  })
                  it("reverts when the user sent not enough ETH", async () => {
                      await expect(
                          erc721I
                              .connect(user)
                              .mint(
                                  mintArguments[0],
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value.sub(1) }
                              )
                      ).to.be.revertedWith("NotEnoughValue()")
                  })
                  it("reverts when amount of NFTs after minting exceeds stage supply", async () => {
                      await erc721I.updateStage(
                          0,
                          ethers.utils.parseEther("1"),
                          2,
                          rootHash,
                          11,
                          0,
                          10
                      )
                      for (let i = 0; i < 5; i++) {
                          await erc721I
                              .connect(accounts[i])
                              .mint(
                                  mintArguments[0],
                                  merkleTree(whitelistAddresses, accounts[i].address).hexProof,
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value }
                              )
                      }
                      await expect(
                          erc721I
                              .connect(accounts[5])
                              .mint(
                                  mintArguments[0],
                                  merkleTree(whitelistAddresses, accounts[5].address).hexProof,
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value }
                              )
                      ).to.be.revertedWith("StageSupplyExceeded()")
                  })
                  it("reverts when an user's NFTs amount exceeds wallet limit", async () => {
                      const invalidQty = (await erc721I.getGlobalWalletLimit()).add(1)
                      const correspondingValue = invalidQty.mul(
                          (await erc721I.getStageInfo(0))[0][0]
                      )
                      await expect(
                          erc721I
                              .connect(user)
                              .mint(
                                  invalidQty,
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3],
                                  {
                                      value: correspondingValue,
                                  }
                              )
                      ).to.be.revertedWith("WalletGlobalLimitExceeded()")
                  })
                  it("reverts if the caller is not whitelisted or the hex proof doesn't match", async () => {
                      await expect(
                          erc721I
                              .connect(attacker)
                              .mint(
                                  mintArguments[0],
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value }
                              )
                      ).to.be.revertedWith("InvalidProof()")
                      await expect(
                          erc721I
                              .connect(accounts[whitelistAddresses.length])
                              .mint(
                                  mintArguments[0],
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3],
                                  { value: value }
                              )
                      ).to.be.revertedWith("InvalidProof()")
                  })
                  it("mints NFTs successfully", async () => {
                      await erc721I
                          .connect(user)
                          .mint(
                              mintArguments[0],
                              mintArguments[1],
                              mintArguments[2],
                              mintArguments[3],
                              {
                                  value: value,
                              }
                          )

                      const stageInfo = await erc721I.connect(user).getStageInfo(0)
                      const walletMinted = stageInfo[1]
                      const stageMinted = stageInfo[2]
                      assert.equal(mintArguments[0].toString(), walletMinted.toString())
                      assert.equal(mintArguments[0].toString(), stageMinted.toString())
                      assert.equal(
                          mintArguments[0].toString(),
                          (await erc721I.totalSupply()).toString()
                      )

                      for (let i = 0; i < mintArguments[0]; i++) {
                          assert.equal(user.address, await erc721I.ownerOf(i))
                      }
                  })
              })

              describe("crossmint: checks only the points that differ from mint", () => {
                  let hexProof: string[]
                  let mintArguments: any[]
                  let value: BigNumber
                  beforeEach(async () => {
                      hexProof = merkleTree(whitelistAddresses, user.address).hexProof
                      mintArguments = [
                          (await erc721I.getStageInfo(0))[0][1],
                          user.address,
                          hexProof,
                          10,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
                      ]
                      const price = (await erc721I.getStageInfo(0))[0][0]
                      value = price.mul(mintArguments[0])

                      // set mintable state is true
                      await erc721I.setMintable(true)
                      await erc721I.setCrossmintAddress(crossmintAccount.address)
                  })

                  it("reverts when the cross mint address is the zero address", async () => {
                      // sets the crossmint address to the zero address
                      await erc721I.setCrossmintAddress(
                          "0x0000000000000000000000000000000000000000"
                      )

                      await expect(
                          erc721I.crossmint(
                              mintArguments[0],
                              mintArguments[1],
                              mintArguments[2],
                              mintArguments[3],
                              mintArguments[4],
                              { value: value }
                          )
                      ).to.be.revertedWith("CrossmintAddressNotSet()")
                  })
                  it("reverts when the caller isn't the crossmint account", async () => {
                      await expect(
                          erc721I
                              .connect(attacker)
                              .crossmint(
                                  mintArguments[0],
                                  mintArguments[1],
                                  mintArguments[2],
                                  mintArguments[3],
                                  mintArguments[4],
                                  { value: value }
                              )
                      ).to.be.revertedWith("CrossmintOnly()")
                  })
                  it("cross mints NFTs successfully", async () => {
                      await erc721I
                          .connect(crossmintAccount)
                          .crossmint(
                              mintArguments[0],
                              mintArguments[1],
                              mintArguments[2],
                              mintArguments[3],
                              mintArguments[4],
                              { value: value }
                          )

                      const stageInfo = await erc721I.connect(user).getStageInfo(0)
                      const walletMinted = stageInfo[1]
                      const stageMinted = stageInfo[2]
                      assert.equal(mintArguments[0].toString(), walletMinted.toString())
                      assert.equal(mintArguments[0].toString(), stageMinted.toString())
                      assert.equal(
                          mintArguments[0].toString(),
                          (await erc721I.totalSupply()).toString()
                      )

                      for (let i = 0; i < mintArguments[0]; i++) {
                          assert.equal(user.address, await erc721I.ownerOf(i))
                      }
                  })
              })

              describe("ownerMint", async () => {
                  let qty: number
                  beforeEach(() => {
                      qty = Number(constructorArguments[3]) / 100
                  })

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).ownerMint(qty, attacker.address)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts when the amount of NFTs after minting exceeds the total supply", async () => {
                      const maxMintableSupply = await erc721I.getMaxMintableSupply()
                      await expect(
                          erc721I.ownerMint(maxMintableSupply.add(1), user.address)
                      ).to.be.revertedWith("NoSupplyLeft()")
                  })
                  it("owner mints successfully", async () => {
                      await erc721I.ownerMint(qty, user.address)

                      assert.equal(qty.toString(), (await erc721I.totalSupply()).toString())

                      for (let i = 0; i < qty; i++) {
                          assert.equal(user.address, await erc721I.ownerOf(i))
                      }
                  })
              })
          })
      })
