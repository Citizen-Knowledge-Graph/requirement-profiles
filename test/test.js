import path from "path"
import { fileURLToPath } from "url"
import fs, { promises as fsPromise } from "fs"
import { describe } from "mocha"
import { strictEqual } from "node:assert"
import { Parser, Store } from "n3"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHACL_DIR_1 = `${ROOT}/sozialplattform/shacl`
const SHACL_DIR_2 = `${ROOT}/beta`
const DATAFIELDS_FILE = `${ROOT}/sozialplattform/datafields.ttl`
const MATERIALIZATION_FILE = `${ROOT}/sozialplattform/materialization.ttl`

describe("Turtle files integrity", function () {
    let turtleFiles = [ DATAFIELDS_FILE, MATERIALIZATION_FILE ]

    before(async function () {
        try {
            turtleFiles = turtleFiles.concat((await fsPromise.readdir(SHACL_DIR_1)).map(file => `${SHACL_DIR_1}/${file}`))
            turtleFiles = turtleFiles.concat((await fsPromise.readdir(SHACL_DIR_2)).map(file => `${SHACL_DIR_2}/${file}`))
        } catch (error) {
            throw new Error(`Failed to collect turtle files: ${error.message}`)
        }
    })

    it("should contain Turtle files", function () {
        strictEqual(turtleFiles.length > 0, true, "No turtle files found")
    })

    it("should have .ttl extension", function () {
        turtleFiles.forEach((file) => {
            strictEqual(file.toLowerCase().endsWith(".ttl"), true, `File ${file} does not have a .ttl extension`)
        })
    })

    describe("files should exist and be readable", function () {
        it("should exist", function () {
            turtleFiles.forEach((file) => {
                strictEqual(fs.existsSync(file), true, `File ${file} does not exist`)
            })
        })

        it("should be readable as string and not be empty", async function () {
            for (const file of turtleFiles) {
                let content = await fsPromise.readFile(file, "utf8")
                strictEqual(typeof content, "string", `File ${file} is not readable as a string`)
                strictEqual(content.length > 0, true, `File ${file} is empty`)
            }
        })

        it("should have valid line endings", async function () {
            for (const file of turtleFiles) {
                let content = await fsPromise.readFile(file, "utf8")
                const hasLF = content.includes("\n")
                const hasCRLF = content.includes("\r\n")
                strictEqual(!(hasLF && hasCRLF), true,`File ${file} contains mixed line endings (both LF and CRLF)`)
            }
        })
    })

    describe("files should have valid Turtle syntax", function () {
        it("should be parseable and contain quads", async function () {
            const parser = new Parser()
            const parse = (content) => {
                let count = 0
                return new Promise((resolve, reject) => {
                    parser.parse(content, (err, quad) => {
                        if (err) reject(err)
                        if (quad) count ++
                        else resolve(count)
                    })
                })
            }
            for (const file of turtleFiles) {
                let content = await fsPromise.readFile(file, "utf8")
                let count = 0
                try {
                    count = await parse(content)
                } catch (err) {
                    throw new Error(`Invalid Turtle syntax in ${file}: ${err.message}`)
                }
                strictEqual(count > 0, true, `No parseable quads in ${file}`)
            }
        })
    })
})


describe("Content-related tests on Turtle files", function () {
    let shaclFileContents = {}
    let datafieldsFileContent = ""
    let materializationFileContent = ""

    before(async function () {
        try {
            for (const file of (await fsPromise.readdir(SHACL_DIR_1))) shaclFileContents[file] = await fsPromise.readFile(`${SHACL_DIR_1}/${file}`, "utf8")
            for (const file of (await fsPromise.readdir(SHACL_DIR_2))) shaclFileContents[file] = await fsPromise.readFile(`${SHACL_DIR_2}/${file}`, "utf8")
            datafieldsFileContent = await fsPromise.readFile(DATAFIELDS_FILE, "utf8")
            materializationFileContent = await fsPromise.readFile(MATERIALIZATION_FILE, "utf8")
        } catch (error) {
            throw new Error(`Failed to read file contents: ${error.message}`)
        }
    })

    it("should have file contents ready", function () {
        strictEqual(Object.keys(shaclFileContents).length > 0, true, "No SHACL files found")
        strictEqual(datafieldsFileContent.length > 0, true, "Datafields file is empty")
        strictEqual(materializationFileContent.length > 0, true, "Materialization file is empty")
    })

    describe("Assertions on requirement profiles alone", function () {
        const store = new Store()
        const parser = new Parser()

        before(async function () {
            const parse = (content) => {
                return new Promise((resolve, reject) => {
                    parser.parse(content, (err, quad) => {
                        if (err) reject(err)
                        if (quad) store.add(quad)
                        else resolve()
                    })
                })
            }
            for (let content of Object.values(shaclFileContents)) await parse(content)
        })

        it("store should not be empty", function () {
            strictEqual(store.countQuads() > 0, true, "Store is empty")
        })

        // TODO
    })
})
