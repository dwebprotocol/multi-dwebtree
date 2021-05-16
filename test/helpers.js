const ddatabase = require('ddatabase')
const { promisify } = require('util')
const ram = require('random-access-memory')
const isEqual = require('lodash/isEqual')
const MultiDTree = require('../')

const OPTIONS = {
        keyEncoding: 'utf-8',
        valueEncoding: 'json',
      }

const helpers = {
  async setup(count, storage) {
    let names = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    let multiDTs = []

    for (let i=0; i<count; i++) {
      let s = storage && `${storage}_${i}` || ram
      let mh = new MultiDTree(s, {...OPTIONS, name: names[i]})
      multiDTs.push(mh)
    }

    let hasPeers = await helpers.checkForPeers(multiDTs, storage)
    return {multiDTs, hasPeers}
  },
  async checkForPeers(multiDTs, storage) {
    if (!storage)
      return
    let peersMap = []
    let hasPeers
    for (let i=0; i<multiDTs.length; i++) {
      let multiDT = multiDTs[i]
      let peers = await multiDT.getPeers()

      if (peers  &&  peers.length)
        hasPeers = true
    }
    return hasPeers
  },
  async put(dwebtree, diff, value) {
    let key = `${value._objectId}`
    let val = cloneDeep(value)
    if (diff)
      val._diff = cloneDeep(diff)

    await dwebtree.put(key, val)
  },
  async delay (ms) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, ms)
    })
  },

  async checkStoreAndDiff(t, multiDTs, storeArr, diffArr, print) {
    for (let i=0; i<multiDTs.length; i++) {
      let multiDT = multiDTs[i]
      let sec = multiDT.createHistoryStream()
      let counter = storeArr.length
      await new Promise((resolve, reject) => {
        sec.on('data', data => {
          if (print)
            console.log(multiDT.name + ' ' + JSON.stringify(data.value, null, 2))
          // Check that it's not peer list
          if (Array.isArray(data.value))
            return

          let { value } = data
          delete value._timestamp
          delete value._prevTimestamp
          delete value._prevSeq
          let v = storeArr.find(val => isEqual(val, value))
          t.same(value, v)
          counter--
        })
        sec.on('end', (data) => {
          if (counter)
            t.fail()
          resolve()
        })
      })
    }

    let diffs = await Promise.all(multiDTs.map(mh => mh.getDiff()))
    for (let i=0; i<diffs.length; i++) {
      let hstream = diffs[i].createHistoryStream()
      let multiDT = multiDTs[i]
      await new Promise((resolve, reject) => {
        hstream.on('data', ({value}) => {
          if (print)
            console.log(multiDT.name + 'Diff ' + JSON.stringify(value, null, 2))
          delete value._timestamp
          delete value.obj._prevTimestamp
          delete value._prevSeq
          t.same(value, diffArr[0])
          diffArr.shift()
        })
        hstream.on('end', (data) => {
          resolve()
        })
      })
    }
  }
}
module.exports = helpers