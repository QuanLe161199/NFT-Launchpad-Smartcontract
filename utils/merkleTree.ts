import { MerkleTree } from "merkletreejs"
import keccak256 from "keccak256"

const merkleTree = (addresses: string[], caller: string) => {
    const leafNodes = addresses.map((address) => keccak256(address))
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
    const rootHash = merkleTree.getHexRoot()
    const leaf = keccak256(caller)
    const hexProof = merkleTree.getHexProof(leaf)

    return { rootHash, hexProof }
}

export default merkleTree
