
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";


class Promise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.callbacks = [];

    let resolve = (value) => {
      if (value instanceof Promise) {
        return value.then(resolve, reject);
      }
      if (this.status !== PENDING) {
        return;
      }
      this.status = FULFILLED;
      this.value = value;
      if (this.callbacks.length > 0) {
        this.callbacks.forEach((callbackObj) => {
          callbackObj.onFulfilled(this.value);
        })
      }
    }

    let reject = (reason) => {
      if (this.status !== PENDING) {
        return;
      }
      this.status = REJECTED;
      this.reason = reason;
      if (this.callbacks.length > 0) {
        this.callbacks.forEach((callbackObj) => {
          callbackObj.onRejected(this.reason);
        })
      }
    }

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }

  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : value => value;
    onRejected = typeof onRejected === "function" ? onRejected : reason => { throw reason };
    const promise2 = new Promise((resolve, reject) => {
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            let result = onFulfilled(this.value);
            resolvePromise(result, promise2, resolve, reject);
          } catch (error) {
            reject(error)
          }
        })

      }
      if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            let result = onRejected(this.reason);
            resolvePromise(result, promise2, resolve, reject);
          } catch (error) {
            reject(error)
          }
        })
      }
      if (this.status === PENDING) {
        this.callbacks.push({
          onFulfilled: () => {
            setTimeout(() => {
              try {
                let result = onFulfilled(this.value);
                resolvePromise(result, promise2, resolve, reject);
              } catch (error) {
                reject(error)
              }
            })
          },
          onRejected: () => {
            setTimeout(() => {
              try {
                let result = onRejected(this.reason);
                resolvePromise(result, promise2, resolve, reject);
              } catch (error) {
                reject(error)
              }
            })
          }
        })
      }
    })

    return promise2;
  }

  catch(onRejected){
    return this.then(undefined, onRejected);
  }

  static resolve = function (value) {
    return new Promise((resolve, reject) => {
      if (value instanceof Promise) {
        value.then(resolve, reject);
      } else {
        resolve(value);
      }
    })
  }

  static reject = function (reason) {
    return new Promise((resolve, reject) => {
      reject(reason);
    })
  }

  static all = function (promiseArr) {
    let length = promiseArr.length;
    let resolveArr = new Array(length);
    let resolveCount = 0; //返回成功的个数
    return new Promise((resolve, reject) => {
      promiseArr.forEach((promiseItem, index) => {
        Promise.resolve(promiseItem).then(
          value => {
            resolveCount++;
            resolveArr[index] = value;
            if (length === resolveCount) {
              resolve(resolveArr);
            }
          },
          reject
        )
      })
    })
  }

  static race = function(promiseArr){
    return new Promise((resolve, reject) => {
      promiseArr.forEach((promiseItem) => {
        Promise.resolve(promiseItem).then(resolve, reject);
      })
    })
  }
}

function resolvePromise(result, promise2, resolve, reject) {
  if (result === promise2) {
    return reject(new TypeError('chaining cycle detected for promise!'))
  }
  if (result && (typeof result === 'object' || typeof result === 'function')) {
    let called;
    try {
      let then = result.then;
      if (typeof then === 'function') {
        then.call(result, value => {
          if (called) return;
          called = true;
          resolvePromise(value, promise2, resolve, reject);
          //resolve(value)
        }, reason => {
          if (called) return;
          called = true;
          reject(reason);
        });

      } else {
        resolve(result);
      }
    } catch (error) {
      if (called) return;
      called = true;
      reject(error);
    }
  } else {
    resolve(result);
  }
}

//测试代码
/* Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
} */

module.exports = Promise;