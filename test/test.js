import path from "path"
import { fileURLToPath } from "url"
import fs, { promises as fsPromise } from "fs"
import { describe } from "mocha"
import { strictEqual } from "node:assert"
import { Parser } from "n3"

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


describe("Tests on requirement profiles", function () {
    // TODO
})
