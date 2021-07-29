jest.mock("../lib/helpers/createMappingsSerializer");
const SourceMapSource = require("../").SourceMapSource;
const OriginalSource = require("../").OriginalSource;
const ConcatSource = require("../").ConcatSource;
const ReplaceSource = require("../").ReplaceSource;
const SourceNode = require("source-map").SourceNode;
const { withReadableMappings } = require("./helpers");

describe("SourceMapSource", () => {
	it("map correctly", () => {
		const innerSourceCode =
			["Hello World", "is a test string"].join("\n") + "\n";
		const innerSource = new ConcatSource(
			new OriginalSource(innerSourceCode, "hello-world.txt"),
			new OriginalSource("Translate: ", "header.txt"),
			"Other text"
		);

		const source = new SourceNode(null, null, null, [
			"Translated: ",
			new SourceNode(1, 0, "text", "Hallo", "Hello"),
			" ",
			new SourceNode(1, 6, "text", "Welt\n", "World"),
			new SourceNode(2, 0, "text", "ist ein", "nope"),
			" test ",
			new SourceNode(2, 10, "text", "Text\n"),
			new SourceNode(3, 11, "text", "Anderer"),
			" ",
			new SourceNode(3, 17, "text", "Text")
		]);
		source.setSourceContent("text", innerSourceCode);

		const sourceR = source.toStringWithSourceMap({
			file: "translated.txt"
		});

		const sourceMapSource1 = new SourceMapSource(
			sourceR.code,
			"text",
			sourceR.map.toJSON(),
			innerSource.source(),
			innerSource.map()
		);
		const sourceMapSource2 = new SourceMapSource(
			sourceR.code,
			"text",
			sourceR.map.toJSON(),
			innerSource.source(),
			innerSource.map(),
			true
		);

		const expectedContent = [
			"Translated: Hallo Welt",
			"ist ein test Text",
			"Anderer Text"
		].join("\n");
		expect(sourceMapSource1.source()).toEqual(expectedContent);
		expect(sourceMapSource2.source()).toEqual(expectedContent);

		expect(withReadableMappings(sourceMapSource1.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:12 -> [hello-world.txt] 1:0 (Hello), :17, :18 -> [hello-world.txt] 1:6 (World)
		2:0 -> [hello-world.txt] 2:0, :7, :13 -> [hello-world.txt] 2:10
		3:0 -> [text] 3:11, :7, :8 -> [text] 3:17",
		  "file": "x",
		  "mappings": "YCAAA,K,CAAMC;AACN,O,MAAU;ADCC,O,CAAM",
		  "names": Array [
		    "Hello",
		    "World",
		  ],
		  "sources": Array [
		    "text",
		    "hello-world.txt",
		  ],
		  "sourcesContent": Array [
		    "Hello World
		is a test string
		Translate: Other text",
		    "Hello World
		is a test string
		",
		  ],
		  "version": 3,
		}
	`);

		expect(withReadableMappings(sourceMapSource2.map())).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:12 -> [hello-world.txt] 1:0 (Hello), :17, :18 -> [hello-world.txt] 1:6 (World)
		2:0 -> [hello-world.txt] 2:0, :7, :13 -> [hello-world.txt] 2:10",
		  "file": "x",
		  "mappings": "YAAAA,K,CAAMC;AACN,O,MAAU",
		  "names": Array [
		    "Hello",
		    "World",
		  ],
		  "sources": Array [
		    "hello-world.txt",
		  ],
		  "sourcesContent": Array [
		    "Hello World
		is a test string
		",
		  ],
		  "version": 3,
		}
	`);

		const hash = require("crypto").createHash("sha256");
		sourceMapSource1.updateHash(hash);
		const digest = hash.digest("hex");
		expect(digest).toMatchInlineSnapshot(
			`"a61a2da7f3d541e458b1af9c0ec25d853fb929339d7d8b22361468be67326a52"`
		);

		const clone = new SourceMapSource(...sourceMapSource1.getArgsAsBuffers());
		expect(clone.sourceAndMap()).toEqual(sourceMapSource1.sourceAndMap());

		const hash2 = require("crypto").createHash("sha256");
		clone.updateHash(hash2);
		const digest2 = hash2.digest("hex");
		expect(digest2).toEqual(digest);
	});

	it("should handle null sources and sourcesContent", () => {
		const a = new SourceMapSource("hello world\n", "hello.txt", {
			version: 3,
			sources: [null],
			sourcesContent: [null],
			mappings: "AAAA"
		});
		const b = new SourceMapSource("hello world\n", "hello.txt", {
			version: 3,
			sources: [],
			sourcesContent: [],
			mappings: "AAAA"
		});
		const c = new SourceMapSource("hello world\n", "hello.txt", {
			version: 3,
			sources: ["hello-source.txt"],
			sourcesContent: ["hello world\n"],
			mappings: "AAAA"
		});
		const sources = [a, b, c].map(s => {
			const r = new ReplaceSource(s);
			r.replace(1, 4, "i");
			return r;
		});
		const source = new ConcatSource(...sources);

		expect(source.source()).toMatchInlineSnapshot(`
		"hi world
		hi world
		hi world
		"
	`);
		expect(withReadableMappings(source.map(), source.source()))
			.toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [null] 1:0
		hi world
		^_______
		3:0 -> [hello-source.txt] 1:0, :1 -> [hello-source.txt] 1:1, :2 -> [hello-source.txt] 1:5
		hi world
		^^^_____
		",
		  "file": "x",
		  "mappings": "AAAA;;ACAA,CAAC,CAAI",
		  "names": Array [],
		  "sources": Array [
		    null,
		    "hello-source.txt",
		  ],
		  "sourcesContent": Array [
		    null,
		    "hello world
		",
		  ],
		  "version": 3,
		}
	`);
		expect(
			withReadableMappings(source.map({ columns: false }), source.source())
		).toMatchInlineSnapshot(`
		Object {
		  "_mappings": "1:0 -> [null] 1:0
		hi world
		^_______
		3:0 -> [hello-source.txt] 1:0
		hi world
		^_______
		",
		  "file": "x",
		  "mappings": "AAAA;;ACAA",
		  "names": Array [],
		  "sources": Array [
		    null,
		    "hello-source.txt",
		  ],
		  "sourcesContent": Array [
		    null,
		    "hello world
		",
		  ],
		  "version": 3,
		}
	`);
	});
});
