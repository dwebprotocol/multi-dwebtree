const test = require('tape')
const DWebTree = require('dwebtree')
const ram = require('random-access-memory')
const cloneDeep = require('lodash/cloneDeep')
const pump = require('pump')
const fs = require('fs')
const path = require('path')
// const { promisify } = require('util')
const { checkForPeers, checkStoreAndDiff, setup, delay } = require('./helpers')

const MultiDTree = require('../')
var { object0, object1, object1_1, object2,
      diff0, diff1, diff1_1, diff2 } = require('./constants')

test('Multidwebtree - value should be JSON object', async t => {
  let { multiDTs } = await setupReplChannel(1)
  let mh = multiDTs[0]
  try {
    await mh.put('key', 'value')
  } catch(err) {
    t.ok(err, /value expected to be JSON object/)
  }
  t.end()
})
test('Multidwebtree - persistent storage, basic functionality', async t => {
  let storage = './test/mh/'
  // let { multiDTs, hasPeers, streams } = await setupReplChannel(2, storage)
  let { multiDTs } = await setupReplChannel(2, storage)

  let [primary, secondary] = multiDTs
  await put(primary, diff0, object0)
  await delay(100)
  await put(primary, diff1, object1)
  await delay(100)
  await put(secondary, diff1_1, object1_1)
  await delay(100)
  let storeArr = [object0, object1, object1_1]
  let diffArr = [diff0, diff1, diff1_1]
  await checkStoreAndDiff(t, multiDTs, storeArr, diffArr)
  t.end()
})
test('Multidwebtree - auto-generate diff', async t => {
  const { multiDTs } = await setupReplChannel(2)
  const [ primary, secondary ] = multiDTs

  // The delays are artificial. Without them the mesages get lost for some reason
  await put(primary, diff0, object0)
await delay(100)
  await put(primary, diff1, object1)
await delay(100)
  await put(secondary, diff1_1, object1_1)
await delay(100)
  await put(secondary, null, object2)
await delay(100)
  let storeArr = [object0, object1, object1_1, object2]
  let diffArr = [diff0, diff1, diff1_1, diff2]
  await checkStoreAndDiff(t, multiDTs, storeArr, diffArr)

  if (diffArr.length)
    t.fail()
  t.end()
})

async function setupReplChannel(count, storage) {
  let { hasPeers, multiDTs } = await setup(count, storage)

  let streams = []
  for (let i=0; i<multiDTs.length; i++) {
    let cur = i
    let j = 0
    let multiDT = multiDTs[i]
    let diffFeed = (await multiDT.getDiff()).feed
    for (; j<multiDTs.length; j++) {
      if (j === cur) continue
      await multiDTs[j].addPeer(diffFeed.key)
    }
  }

  for (let i=0; i<multiDTs.length; i++) {
    let cur = i
    let j = 0
    let multiDT = multiDTs[i]

    for (; j<multiDTs.length; j++) {
      if (j === cur) continue
      let cloneFeeds = await multiDTs[j].getPeers()
      for (let ii=0; ii<cloneFeeds.length; ii++) {
        let pstream = await multiDT.replicate(false, {live: true})
        streams.push(pstream)
        let cstream = cloneFeeds[ii].feed.replicate(true, {live: true})
        streams.push(cstream)
        pump(pstream, cstream, pstream)
      }
    }
  }
  return { multiDTs, hasPeers, streams }
}
async function put(dwebtree, diff, value) {
  // debugger
  let key = `${value._objectId}`
  let val = cloneDeep(value)
  if (diff)
    val._diff = cloneDeep(diff)

  await dwebtree.put(key, val)
}

/*
  // if (hasPeers) {
  //   rmdir(storage, function(error) {
  //     if (error)
  //       console.log(`Error deleting directory ${storage}`, error)
  //     else
  //       console.log(`directory ${storage} was successfully deleted`)
  //   })
  // }
  // for (let i=0; i<streams.length; i++) {
  //   const stream = streams[i]
  //   stream.end()
  //   stream.destroy()
  // }
  // await delay(2000)
  // debugger
  // for (let i=0; i<multiDTs.length; i++) {
  //   let peers = await multiDTs[i].getPeers()
  //   for (let i=0; i<peers.length; i++) {
  //     let peer = prPeers[i]
  //     await promisify(peer.feed.close.bind(peer.feed))()
  //   }
  // }
  // await promisify(primary.feed.close.bind(primary.feed))()
  // await promisify(secondary.feed.close.bind(secondary.feed))()
  // await promisify(primary.diffFeed.close.bind(primary.diffFeed))()
  // await promisify(secondary.diffFeed.close.bind(secondary.diffFeed))()
 */