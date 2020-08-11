/**
 * 自定义Promise函数模块:匿名函数自调用
 */
/**常量定义 */
const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';
(function (window) { 

  class Promise{
    constructor(excutor) {
      const _this = this;//保存当前的this
      this.status = PENDING;//给promise对象指定status属性，初始值为pending
      this.data = undefined;//给promise对象指定一个用于储存结果数据的属性
      this.callbacks = [];//每个元素的结构：{onresolved(){},onrejected(){}}
      function resolve(value) {
        //改变状态为resolved，如果状态不是pending就不用修改状态了(防止重复调用，状态只能修改一次)
        if (_this.status !== PENDING) {
          return;
        }
        _this.status = RESOLVED;
        //保存value数据
        _this.data = value;
        //如果有待执行的callback的函数，立即异步执行回调函数onResolved
        if (_this.callbacks.length > 0) {
          //将函数放在回调队列里执行（这里模拟一下）
          setTimeout(() => {//放入队列中执行所有的成功的回调
            _this.callbacks.forEach(callbacksObj => {
              callbacksObj.onResolved(value)
            });
          }, 0);
        }
      }

      function reject(reason) {
        //改变状态为resolved，如果状态不是pending就不用修改状态了
        if (_this.status !== PENDING) {
          return;
        }
        //改变状态为rejected
        _this.status = REJECTED;
        //保存reason
        _this.data = reason;
        //如果有待执行的callback的函数，立即异步执行回调函数onRejected
        if (_this.callbacks.length > 0) {
          //将函数放在回调队列里执行（这里模拟一下）
          setTimeout(() => {//放入队列中执行所有的失败的回调
            _this.callbacks.forEach(callbacksObj => {
              callbacksObj.onRejected(reason);
            });
          }, 0);
        }
      }

      //立即同步执行excutor
      try {//捕获异常
        excutor(resolve, reject);
      }
      catch (error) {//如果执行器抛出异常，promise对象状态改为失败状态rejected
        reject(error);
      }
    }
    /**
 * Promise原型对象的then()
 * 指定成功或者失败的回调函数
 * 返回一个新的promise对象
 */
   //这样也可以定义在原型上
    then = function (onResolved, onRejected) {
      /**指定默认函数 */
      //向后传递成功的value
      onResolved = typeof onResolved === 'function' ? onResolved : value => value;
      //实现异常穿透的处理，指定默认的失败回调
      onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

      const _this = this;//保存当前this

      //返回一个新的promise对象
      return new Promise((resolve, reject) => {

        /**封装两个函数,*/
        /**要满足下面条件
         * 1.如果抛出异常，return的promise就会失败，reason就是error
         * 2.如果回调函数不是promise，return的promise就会成功，value就是return的值
         * 3.如果返回的是promise，return的promise结果就会根据这个promise的结果来定
         */
        function handle(callback) {//调用指定的函数处理
          try {
            //接收函数返回值
            const result = callback(_this.data);
            //判断返回类型
            if (result instanceof Promise) {
              /* result.then(
                value => {
                  resolve(value);//当return成功时，让return的promise也成功
                },
                reason => {
                  reject(reason);
                }
              ) */
              /**简洁写法 */
              result.then(resolve, reject);
            }
            else {
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        }

        if (_this.status === PENDING) {
          //将回调函数保存起来
          _this.callbacks.push({
            onResolved(value) {
              handle(onResolved);
            },
            onRejected(reason) {
              handle(onRejected);
            }
          })
        }
        else if (_this.status === RESOLVED) {//resolve
          setTimeout(() => {
            handle(onResolved);
          }, 0);
        }
        else {//'rejected'
          setTimeout(() => {
            handle(onRejected);
          }, 0);
        }
      });
    }

    /**
     * Promise原型对象的catch()
     * 指定失败的回调函数
     * 返回一个新的promise对象
     */
    catch = function (onRejected) {
      return this.then(undefined, onRejected);
    }

    /**
     * Promise函数对象resolve方法
     * 返回一个指定结果的成功的promise（暂时这么理解）
     */
    static resolve = function (value) {
      //返回成功/失败的promise
      return new Promise((resolve, reject) => {
        //value是promise
        if (value instanceof Promise) {//使用value的结果就是promise的结果
          value.then(resolve, reject);
        }
        //value不是Promise
        else {
          resolve(value);
        }
      })
    }

    /**
     * Promise函数对象reject方法
     * 返回一个指定reason的失败的promise
     */
    static reject = function (reason) {
      //返回一个失败的promise
      return new Promise((resolve, reject) => {
        reject(reason);
      })
    }

    /**
     * Promise函数对象all方法
     * 返回一个promise，只有当所有promise都成功时才成功，否则只要有一个失败的就失败
     */
    static all = function (promise) {
      const values = new Array(promise.length);//用来保存成功的promise
      let resolvedCount = 0;//用来保存成功的promise数量
      return new Promise((resolve, reject) => {
        //遍历获取每个promise的结果
        promise.forEach((p, index) => {
          //这里直接用p的话在遇到数组中直接传 非promise的值 就不行了，所以做一个包装将p变为Promise.resolve(p)
          Promise.resolve(p).then(
            value => {
              resolvedCount++;//进来一次成功的数量加一
              //将成功的value放入values
              values[index] = value;//顺序与传入的数组中值一样
              //如果全部成功，将return的promise改为成功
              if (resolvedCount === promise.length) {
                resolve(values);
              }
            },
            reason => {
              reject(reason)//只要有一个错就返回失败的promise
            }
          )
        })
      })
    }

    /**
     * Promise函数对象race方法
     * 返回一个promise，其结果由第一个完成的promise决定
     */
    static race = function (promise) {//这个还有谁最先完成的就由谁决定
      return new Promise((resolve, reject) => {
        promise.forEach(p => {
          //这里直接用p的话在遇到数组中直接传 非promise的值 就不行了，所以做一个包装将p变为Promise.resolve(p)
          Promise.resolve(p).then(
            value => {
              resolve(value);
            },
            reason => {
              reject(reason);
            });
        });
      });
    }

    /**扩展功能 */
    /**
     * 返回一个promise对象，在指定的时间后才确定结果
     */
    static resolveDelay = function (value, time) {
      //返回成功/失败的promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          //value是promise
          if (value instanceof Promise) {//使用value的结果就是promise的结果
            value.then(resolve, reject);
          }
          //value不是Promise
          else {
            resolve(value);
          }
        }, time);
      })
    }
    static rejectDelay = function (reason, time) {
      //返回一个失败的promise
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason);
        }, time);
      })
    }
  }
  


  //向外暴露Promise
  window.Promise = Promise;
})(window);