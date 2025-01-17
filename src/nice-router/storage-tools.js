/* eslint-disable prefer-promise-reject-errors */
import Taro from '@tarojs/taro'
import memoize from 'lodash/memoize'
import md5 from 'blueimp-md5'

const CACHE_PREFIX = 'cachestore-'
const CACHE_EXPIRATION_PREFIX = 'cacheexpiration-'
const EXPIRY_UNITS = 60 * 1000

const shortKey = (key) => (key.length > 100 ? md5(key) : key)

const getKeys = memoize((key = '') => {
  const short = shortKey(key)
  const theKey = CACHE_PREFIX + short
  const exprKey = CACHE_EXPIRATION_PREFIX + short
  return { theKey, exprKey }
})

const currentTime = () => Math.floor(new Date().getTime() / EXPIRY_UNITS)

const StorageTools = {
  PageCachePrefix: 'page-cache-',

  get(key, defaultValue = null) {
    const { exprKey, theKey } = getKeys(key)
    const expiry = Taro.getStorageSync(exprKey)
    if (expiry && currentTime() >= parseInt(expiry, 10)) {
      Taro.removeStorageSync(exprKey)
      Taro.removeStorageSync(theKey)
      return
    }
    const value = Taro.getStorageSync(theKey)
    return value ? JSON.parse(value) : defaultValue
  },

  set(key, value = '', time) {
    const { exprKey, theKey } = getKeys(key)
    if (time) {
      const strTime = (currentTime() + time).toString()
      Taro.setStorageSync(exprKey, strTime)
      Taro.setStorageSync(theKey, JSON.stringify(value))
      return
    }
    Taro.removeStorageSync(exprKey)
    Taro.setStorageSync(theKey, JSON.stringify(value))
  },

  remove(key) {
    const { exprKey, theKey } = getKeys(key)
    Taro.removeStorageSync(exprKey)
    Taro.removeStorageSync(theKey)
  },

  isExpired(key) {
    const { exprKey } = getKeys(key)
    const expiry = Taro.getStorageSync(exprKey)

    const expired = expiry && currentTime() >= parseInt(expiry, 10)
    return expired
  },
  flush() {
    const { keys } = Taro.getStorageInfoSync()
    keys.map((key) => {
      const remove = key.indexOf(CACHE_PREFIX) === 0 || key.indexOf(CACHE_EXPIRATION_PREFIX) === 0
      if (remove) {
        Taro.removeStorage({ key })
      }
    })
  },

  flushWithPrefix(prefix) {
    const { keys } = Taro.getStorageInfoSync()
    keys.map((key) => {
      const remove =
        key.indexOf(`${CACHE_PREFIX}${prefix}`) === 0 || key.indexOf(`${CACHE_EXPIRATION_PREFIX}${prefix}`) === 0
      if (remove) {
        Taro.removeStorage({ key })
      }
    })
  },

  flushExpired() {
    const { keys } = Taro.getStorageInfoSync()
    keys.map((key) => {
      if (key.indexOf(CACHE_EXPIRATION_PREFIX) === 0) {
        const exprKey = key
        const expiry = Taro.getStorageSync(exprKey)
        if (expiry && currentTime() >= parseInt(expiry, 10)) {
          const theKey = CACHE_PREFIX + key.replace(CACHE_EXPIRATION_PREFIX, '')
          Taro.removeStorageSync(exprKey)
          Taro.removeStorageSync(theKey)
        }
      }
    })
  },
}

// Always flush expired items on start time
StorageTools.flushExpired()

export default StorageTools

//
// import CacheStore from 'react-native-cache-store';
//
// CacheStore.set('key', 'value', 10); // Expires in 10 minutes
//
// CacheStore.get('key').then((value) => {
//   // Do something with value
// });
//
// CacheStore.isExpired('key')
//   .then(() => {/* true */ })
//   .catch(() => {/* false */})
