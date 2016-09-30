import {create} from 'src/index'
import * as helper from 'util/helper'
const NB_PEERS = 12

describe(`Fully connected: many peers (${NB_PEERS})`, () => {
  let signalingURL = helper.SIGNALING_URL
  let wcs = []

  describe('Should establish a connection', () => {
    function allJoiningDetectedByAll () {
      let joined = new Map()
      let joinPromises = []
      for (let i = 0; i < NB_PEERS; i++) {
        wcs[i] = create({signalingURL})
        joined.set(i, [])
        if (i !== NB_PEERS - 1) {
          joinPromises.push(new Promise((resolve, reject) => {
            wcs[i].onPeerJoin = id => {
              let joinedTab = joined.get(i)
              expect(joinedTab.includes(id)).toBeFalsy()
              joinedTab.push(id)
              if (joinedTab.length === NB_PEERS - 1) resolve()
            }
          }))
        }
      }
      return Promise.all(joinPromises)
    }

    helper.itBrowser(false, 'one by one', done => {
      allJoiningDetectedByAll()
        .then(() => {
          setTimeout(() => {
            helper.checkMembers(wcs)
            done()
          }, 100)
        })
        .catch(done.fail)

      let joinOneByOne = function (prom, index, key) {
        let i = index
        if (index === NB_PEERS) return prom
        return joinOneByOne(prom.then(() => wcs[i].join(key)), ++index, key)
      }
      wcs[0].open()
        .then(data => joinOneByOne(Promise.resolve(), 1, data.key))
        .catch(done.fail)
    }, 120000)

    helper.itBrowser(false, 'simultaneously', done => {
      allJoiningDetectedByAll()
        .then(() => {
          setTimeout(() => {
            helper.checkMembers(wcs)
            done()
          }, 100)
        })
        .catch(done.fail)
      wcs[0].open()
        .then(data => {
          for (let i = 1; i < wcs.length; i++) wcs[i].join(data.key)
        })
        .catch(done.fail)
    }, 120000)
  })

  describe('Should send/receive', () => {
    helper.itBrowser(false, 'broadcast string message', done => {
      let groups = []
      for (let i = 0; i < NB_PEERS; i++) {
        groups[i] = new helper.TestGroup(wcs[i], [String])
      }
      helper.allMessagesAreSentAndReceived(groups, String)
        .then(done).catch(done.fail)
      for (let g of groups) g.wc.send(g.get(String))
    }, 60000)
  })
})
