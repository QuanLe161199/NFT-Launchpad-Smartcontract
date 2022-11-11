import { assert, expect } from "chai"
import { ERC721I } from "./../../typechain-types/contracts/ERC721I"
import { constructorArguments, developmentChains } from "../../helper-hardhat-config"
import { network, deployments, ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("ERC721I Unit Tests", () => {
          let erc721I: ERC721I
          let accounts: SignerWithAddress[]
          let deployer: SignerWithAddress
          let attacker: SignerWithAddress
          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              attacker = accounts[1]
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
              it("emits an event after changes the cosigner", async () => {
                  await expect(erc721I.setCosigner(newCosignerAddress)).to.emit(
                      erc721I,
                      "SetCosigner"
                  )
              })
              it("changes the cosigner successfully", async () => {
                  const txResponse = await erc721I.setCosigner(newCosignerAddress)
                  const transactionReceipt = await txResponse.wait(1)
                  const setCosignerEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args

                  assert.equal(newCosignerAddress, setCosignerEvent!.cosigner)
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
              it("emits an event after changes the crossmint address", async () => {
                  await expect(erc721I.setCrossmintAddress(newCrossmintAddress)).to.emit(
                      erc721I,
                      "SetCrossmintAddress"
                  )
              })
              it("changes the crossmint address successfully", async () => {
                  const txResponse = await erc721I.setCrossmintAddress(newCrossmintAddress)
                  const transactionReceipt = await txResponse.wait(1)
                  const setCrossmintAddressEvent =
                      transactionReceipt.events![transactionReceipt.events!.length - 1].args

                  assert.equal(newCrossmintAddress, setCrossmintAddressEvent!.crossmintAddress)
                  assert.equal(newCrossmintAddress, await erc721I.getCrossmintAddress())
              })
          })

          describe("setStages", () => {
              const newStages: any[] = [
                  [
                      ethers.utils.parseEther("1"),
                      2,
                      "0x0000000000000000000000000000000000000000000000000000000000000000",
                      0,
                      5,
                      10,
                  ],
                  [
                      ethers.utils.parseEther("1"),
                      2,
                      "0x0000000000000000000000000000000000000000000000000000000000000000",
                      0,
                      70,
                      75,
                  ],
              ]

              it("reverts when the caller isn't the owner", async () => {
                  await expect(erc721I.connect(attacker).setStages(newStages)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("reverts when input contains invalid timestamps", async () => {
                  const insufficientStageTimeGapStages: any[] = [
                      [
                          ethers.utils.parseEther("1"),
                          2,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
                          0,
                          5,
                          10,
                      ],
                      [
                          ethers.utils.parseEther("1"),
                          2,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
                          0,
                          15,
                          20,
                      ],
                  ]
                  await expect(
                      erc721I.setStages(insufficientStageTimeGapStages)
                  ).to.be.revertedWith("InsufficientStageTimeGap()")

                  const invalidStartAndEndTimestampStages: any[] = [
                      [
                          ethers.utils.parseEther("1"),
                          2,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
                          0,
                          5,
                          10,
                      ],
                      [
                          ethers.utils.parseEther("1"),
                          2,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
                          0,
                          70,
                          60,
                      ],
                  ]
                  await expect(
                      erc721I.setStages(invalidStartAndEndTimestampStages)
                  ).to.be.revertedWith("InvalidStartAndEndTimestamp()")
              })
              it("emits events after changes stages successfully", async () => {
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
              const stages: any[] = [
                  [
                      ethers.utils.parseEther("1"),
                      2,
                      "0x0000000000000000000000000000000000000000000000000000000000000000",
                      0,
                      5,
                      10,
                  ],
                  [
                      ethers.utils.parseEther("1"),
                      2,
                      "0x0000000000000000000000000000000000000000000000000000000000000000",
                      0,
                      70,
                      75,
                  ],
              ]
              beforeEach(async () => {
                  await erc721I.setStages(stages)
              })

              describe("setMintable", () => {
                  const mintable = true

                  it("reverts when the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setMintable(mintable)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("emits an event after changes mintable state successfully", async () => {
                      await expect(erc721I.setMintable(mintable)).to.emit(erc721I, "SetMintable")
                  })
                  it("changes mintable state successfully", async () => {
                      const txResponse = await erc721I.setMintable(mintable)
                      const transactionReceipt = await txResponse.wait(1)

                      const setMintableEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(mintable, setMintableEvent!.mintable)

                      assert.equal(mintable, await erc721I.getMintable())
                  })
              })

              describe("setMaxMintableSupply", () => {
                  let newMaxMintableSupply: number
                  beforeEach(() => {
                      newMaxMintableSupply = (Number(constructorArguments[3]) * 90) / 100
                  })

                  it("reverts if the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setMaxMintableSupply(newMaxMintableSupply)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts if the new index is greater than the old index", async () => {
                      const invalidMintableSupply = Number(constructorArguments[3]) + 1
                      await expect(
                          erc721I.setMaxMintableSupply(invalidMintableSupply)
                      ).to.be.revertedWith("CannotIncreaseMaxMintableSupply()")
                  })
                  it("emits an event after changes max mintable supply index", async () => {
                      await expect(erc721I.setMaxMintableSupply(newMaxMintableSupply)).to.emit(
                          erc721I,
                          "SetMaxMintableSupply"
                      )
                  })
                  it("changes mintable supply index successfully", async () => {
                      const txResponse = await erc721I.setMaxMintableSupply(newMaxMintableSupply)

                      const transactionReceipt = await txResponse.wait(1)
                      const setMaxMintableSupplyEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(
                          newMaxMintableSupply.toString(),
                          setMaxMintableSupplyEvent!.maxMintableSupply
                      )

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

                  it("reverts if the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setGlobalWalletLimit(newGlobalWalletLimit)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts if new global wallet limit index is greater than max mintable supply index", async () => {
                      const invalidGlobalWalletLimit = Number(constructorArguments[3]) + 1
                      await expect(
                          erc721I.setGlobalWalletLimit(invalidGlobalWalletLimit)
                      ).to.be.revertedWith("GlobalWalletLimitOverflow()")
                  })
                  it("emits an event after changes global wallet limit index successfully", async () => {
                      await expect(erc721I.setGlobalWalletLimit(newGlobalWalletLimit)).to.emit(
                          erc721I,
                          "SetGlobalWalletLimit"
                      )
                  })
                  it("changes global wallet limit index successfully", async () => {
                      const txResponse = await erc721I.setGlobalWalletLimit(newGlobalWalletLimit)

                      const transactionReceipt = await txResponse.wait(1)
                      const setGlobalWalletLimitEvent =
                          transactionReceipt.events![transactionReceipt.events!.length - 1].args
                      assert.equal(
                          newGlobalWalletLimit.toString(),
                          setGlobalWalletLimitEvent!.globalWalletLimit.toString()
                      )

                      assert.equal(
                          newGlobalWalletLimit.toString(),
                          (await erc721I.getGlobalWalletLimit()).toString()
                      )
                  })
              })

              describe("setActiveStage", () => {
                  const newActiveStage = 1

                  it("reverts if the caller isn't the owner", async () => {
                      await expect(
                          erc721I.connect(attacker).setActiveStage(newActiveStage)
                      ).to.be.revertedWith("Ownable: caller is not the owner")
                  })
                  it("reverts if the new active stage is invalid", async () => {
                      const invalidStage = stages.length
                      await expect(erc721I.setActiveStage(invalidStage)).to.be.revertedWith(
                          "InvalidStage()"
                      )
                  })
                  it("emits an event after changes active stage successfully", async () => {
                      await expect(erc721I.setActiveStage(newActiveStage)).to.emit(
                          erc721I,
                          "SetActiveStage"
                      )
                  })
              })

              describe("updateStage", () => {
                  const newStage: any[] = [
                      0,
                      ethers.utils.parseEther("2"),
                      3,
                      "0x0000000000000000000000000000000000000000000000000000000000000000",
                      5,
                      0,
                      5,
                  ]

                  it("reverts if the caller isn't the owner", async () => {
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
                  it("reverts if the index of stage is invalid", async () => {
                      const invalidStage: any[] = [
                          stages.length,
                          ethers.utils.parseEther("2"),
                          3,
                          "0x0000000000000000000000000000000000000000000000000000000000000000",
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
              })
          })
      })
