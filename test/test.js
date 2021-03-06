/**
 * Ramble unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var abi = require("augur-abi");
var augur = require("augur.js");
var ipfsAPI = require("ipfs-api");
var ramble = require("../");
var DEBUG = false;
ramble.debug = DEBUG;

var TIMEOUT = 240000;

describe("Metadata", function () {

    augur.connect();
    var markets = augur.getMarketsInBranch(augur.branches.dev);
    var numMarkets = markets.length;
    var market = markets[numMarkets - 1];

    var metadata = {
        marketId: market,
        details: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        tags: ["latin", "lorem ipsum"],
        source: "Reality Keys",
        links: [
            "http://www.lipsum.com/",
            "https://github.com/traviskaufman/node-lipsum"
        ]
    };
    var ipfsHash;

    before(function (done) {
        this.timeout(TIMEOUT);
        ramble.remote = ramble.remoteNodes[ramble.remoteNodeIndex];
        ramble.ipfs = ipfsAPI(ramble.remote);
        ramble.ipfs.add.call(ramble.ipfs, new Buffer(JSON.stringify(metadata)), function (err, files) {
            if (DEBUG) console.log("ramble.ipfs.add:", err, files);
            ipfsHash = (files.constructor === Array) ? files[0].Hash : files.Hash;
            done();
        });
    });

    it("add metadata to market " + market, function (done) {
        this.timeout(TIMEOUT);
        ramble.addMetadata(metadata,
            function (sentResponse) {
                if (DEBUG) console.log("sent:", sentResponse);
                assert.property(sentResponse, "txHash");
                assert.strictEqual(sentResponse.callReturn, "1");
            },
            function (successResponse) {
                if (DEBUG) console.log("success:", successResponse);
                assert.property(successResponse, "txHash");
                assert.strictEqual(successResponse.callReturn, "1");
                assert.strictEqual(successResponse.from, ramble.connector.from);
                assert.strictEqual(successResponse.to, augur.contracts.ramble);
                assert.isAbove(Number(successResponse.blockHash), 0);
                assert.isAbove(Number(successResponse.blockNumber), 0);
                assert.strictEqual(Number(successResponse.value), 0);
                done();
            },
            function (err) {
                done(new Error(JSON.stringify(err)));
            }
        );
    });

    it("retrieve metadata from its hash", function (done) {
        this.timeout(TIMEOUT);
        if (DEBUG) console.log("ipfsHash:", ipfsHash);
        ramble.getMetadata(ipfsHash, function (err, data) {
            assert.isNull(err);
            assert.isObject(data);
            assert.strictEqual(data.marketId, metadata.marketId);
            assert.strictEqual(data.details, metadata.details);
            assert.deepEqual(data.links, metadata.links);
            assert.deepEqual(data.tags, metadata.tags);
            done();
        });
    });

    it("get metadata for market " + market, function (done) {
        this.timeout(TIMEOUT);
        ramble.getMarketMetadata(market, null, function (err, marketMetadata) {
            if (DEBUG) console.log(marketMetadata);
            assert.isNull(err);
            assert.isObject(marketMetadata);
            assert.property(marketMetadata, "source");
            assert.property(marketMetadata, "marketId");
            assert.property(marketMetadata, "details");
            assert.property(marketMetadata, "links");
            assert.property(marketMetadata, "tags");
            done();
        });
    });
});

describe("Comments", function () {
    var markets, numMarkets, market, comment, ipfsHash, ipfsData;

    augur.connect();
    markets = augur.getMarketsInBranch(augur.branches.dev);
    numMarkets = markets.length;
    market = markets[numMarkets - 1];
    if (numMarkets > 10) {
        markets = markets.slice(numMarkets - 10, numMarkets - 1);
    }

    comment = {
        marketId: market,
        author: ramble.connector.from,
        message: "haters gonna hate",
        broadcast: false
    };
    ipfsHash = "QmUTAHurKVErazXoNNLDZi7v4MYduLNSckLvY7zhT1gJaD";
    ipfsData = ramble.ipfs.Buffer(JSON.stringify({
        "marketId": "-0xd7d2bb0f5302c85649fed3e74391861c673fc53068823e911ff3938e68064d84",
        "author": "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b",
        "message": "haters gonna hate"
    }));

    it("retrieve a comment from its hash", function (done) {
        this.timeout(TIMEOUT);
        var blockNumber = 2;
        ramble.getComment(ipfsHash, null, function (err, c) {
            assert.isNull(err);
            assert.isObject(c);
            assert.property(c, "author");
            assert.strictEqual(c.author, "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b");
            assert.property(c, "message");
            assert.strictEqual(c.message, comment.message);
            assert.notProperty(c, "blockNumber");
            assert.notProperty(c, "time");
            ramble.getComment(ipfsHash, blockNumber, function (err, c) {
                assert.isNull(err);
                assert.isObject(c);
                assert.property(c, "author");
                assert.strictEqual(c.author, "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b");
                assert.property(c, "message");
                assert.strictEqual(c.message, comment.message);
                assert.property(c, "blockNumber");
                assert.strictEqual(c.blockNumber, blockNumber);
                assert.property(c, "time");
                assert.isAbove(c.time, 0);
                done();
            });
        });
    });

    it("add a comment to market " + market, function (done) {
        this.timeout(TIMEOUT);
        ramble.addMarketComment(comment,
            function (res) {
                // sent
                assert.property(res, "txHash");
                assert.strictEqual(res.callReturn, "1");
            },
            function (res) {
                // success
                assert.property(res, "txHash");
                assert.strictEqual(res.callReturn, "1");
                assert.strictEqual(res.from, ramble.connector.from);
                assert.strictEqual(res.to, augur.contracts.ramble);
                assert.isAbove(Number(res.blockHash), 0);
                assert.isAbove(Number(res.blockNumber), 0);
                assert.strictEqual(Number(res.value), 0);
                done();
            },
            done
        );
    });

    it("get comments for market " + market, function (done) {
        this.timeout(TIMEOUT);
        ramble.getMarketComments(market, {numComments: 3}, function (err, comments) {
            assert.isNull(err);
            assert.isAbove(comments.length, 0);
            assert.isArray(comments);
            for (var i = 0, len = comments.length; i < len; ++i) {
                assert.isObject(comments[i]);
                assert.property(comments[i], "author");
                assert.property(comments[i], "message");
                assert.property(comments[i], "blockNumber");
                assert.isAbove(comments[i].blockNumber, 0);
                assert.property(comments[i], "time");
                assert.isAbove(comments[i].time, 0);
            }
            done();
        });
    });

    it("pin comment to all remote nodes", function (done) {
        this.timeout(TIMEOUT);
        delete require.cache[require.resolve("../")];
        var ramble = require("../");
        ramble.debug = DEBUG;
        ramble.broadcastPin(ipfsData, ipfsHash, function (err, pinningNodes) {
            assert.isNull(err);
            assert.isArray(pinningNodes);
            assert.strictEqual(pinningNodes.length, ramble.remoteNodes.length);
            assert.sameDeepMembers(pinningNodes, ramble.remoteNodes);
            assert.sameDeepMembers(pinningNodes, ramble.constants.IPFS_REMOTE);
            done();
        });
    });

    it("graceful IPFS node failure", function (done) {
        this.timeout(TIMEOUT*4);
        delete require.cache[require.resolve("../")];
        ramble = require("../");
        ramble.debug = DEBUG;
        var badHost = "sfpi.rugua.net";

        // insert bad node manually into remoteNodes array
        var NUM_NODES = 3;
        var com = abi.copy(comment);
        com.broadcast = true;
        com.message = "players gonna play";
        assert.strictEqual(ramble.remoteNodeIndex, 0);
        assert.isArray(ramble.remoteNodes);
        assert.strictEqual(ramble.remoteNodes.length, NUM_NODES);
        assert.deepEqual(ramble.remoteNodes, ramble.constants.IPFS_REMOTE);
        ramble.remoteNodes[0].host = badHost;
        ramble.remote = ramble.remoteNodes[0].host;
        assert.strictEqual(ramble.remoteNodeIndex, 0);
        assert.strictEqual(ramble.useRemoteNode().host, badHost);
        assert.isNotNull(ramble.remote);
        assert.strictEqual(ramble.remoteNodes[ramble.remoteNodeIndex].host, badHost);
        assert.strictEqual(ramble.remote.host, badHost);
        assert.strictEqual(ramble.remoteNodes.length, NUM_NODES);
        ramble.addMarketComment(com,
            function (res) {
                assert.isNotNull(ramble.remote);
                assert.strictEqual(ramble.remoteNodeIndex, 2);
                assert.deepEqual(ramble.remote, ramble.remoteNodes[1]);
                assert.property(res, "txHash");
                assert.strictEqual(res.callReturn, "1");
            },
            function (res) {
                assert.property(res, "txHash");
                assert.strictEqual(res.callReturn, "1");
                assert.strictEqual(res.from, ramble.connector.from);
                assert.strictEqual(res.to, ramble.connector.contracts.ramble);
                assert.isAbove(Number(res.blockHash), 0);
                assert.isAbove(Number(res.blockNumber), 0);
                assert.strictEqual(Number(res.value), 0);

                // specify bad node as argument to useRemoteNode
                ramble.remoteNodeIndex = 0;
                ramble.remoteNodes = abi.copy(ramble.constants.IPFS_REMOTE);
                assert.deepEqual(ramble.remoteNodes, ramble.constants.IPFS_REMOTE);
                assert.strictEqual(ramble.useRemoteNode({
                    host: badHost,
                    port: "443",
                    protocol: "https"
                }).host, badHost);
                assert.isNotNull(ramble.remote);
                assert.strictEqual(ramble.remoteNodes[ramble.remoteNodeIndex].host, badHost);
                assert.strictEqual(ramble.remote.host, badHost);
                assert.strictEqual(ramble.remoteNodes.length, NUM_NODES + 1);
                assert.strictEqual(ramble.remoteNodeIndex, NUM_NODES);
                com.message = "breakers gonna break";
                ramble.addMarketComment(com,
                    function (res) {
                        assert.isNotNull(ramble.remote);
                        assert.strictEqual(ramble.remoteNodeIndex, NUM_NODES + 3);
                        assert.deepEqual(ramble.remote, ramble.remoteNodes[1]);
                        assert.property(res, "txHash");
                        assert.strictEqual(res.callReturn, "1");
                    },
                    function (res) {
                        assert.property(res, "txHash");
                        assert.strictEqual(res.callReturn, "1");
                        assert.strictEqual(res.from, ramble.connector.from);
                        assert.strictEqual(res.to, ramble.connector.contracts.ramble);
                        assert.isAbove(Number(res.blockHash), 0);
                        assert.isAbove(Number(res.blockNumber), 0);
                        assert.strictEqual(Number(res.value), 0);

                        // revert to local IPFS node
                        assert.deepEqual(
                            ramble.useLocalNode(ramble.constants.IPFS_LOCAL),
                            ramble.constants.IPFS_LOCAL
                        );
                        assert.isNotNull(ramble.localNode);
                        assert.isNull(ramble.remote);
                        assert.deepEqual(ramble.localNode, ramble.constants.IPFS_LOCAL);
                        assert.strictEqual(ramble.remoteNodeIndex, NUM_NODES + 3); // unchanged
                        done();
                    },
                    done
                );
            },
            done
        );
    });

});
