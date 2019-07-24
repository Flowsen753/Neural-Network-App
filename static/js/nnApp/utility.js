util = {
  eps: 1e-10,

  avg: arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length,
 
  assert: (condition, message) => {
    if (!condition) {
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message;
    }
  },

  hasLength: (any) => {
    _hasLength = (any, str) => {
      if (any instanceof jQuery) {
        if (!any.length) {
          console.log("Missing Element: " + str)
          return false
        }
        return true
      } else if (typeof any === "array") {
        any.forEach((ele, i) => {
          return _hasLength(ele, str+i)
        })
        return true
      }else if (typeof any === "object"){
        Object.keys(any).forEach((key) => {
          return _hasLength(any[key], key)
        })
        return true
      }
      console.log("hasLength: Unknown parameter type ",typeof(any))
      return false
    }
    return _hasLength(any, "")
  },

  isDefined: (any) => {
    if (typeof any === "array") {
      any.forEach((ele, i) => {
        if (typeof ele === "undefined") {
          console.log("Not defined " + {ele})
          return false
        }
      }) 
      return true
    }else if (typeof any === "object") {
      Object.keys(any).forEach(function(key) {
        if (typeof any[key] === "undefined") {
          console.log("Not defined " + key)
          return false
        }
      }); 
      return true
    }
    console.log("isDefined: Unknown parameter type ", typeof(any))
    return false
  },

  isEmpty: (dict) => {
    return (Object.keys(dict).length == 0)
  },

  compress: function (arr, maxSize) {
    if((arr.length <= maxSize) || (maxSize==0)) {
                    return arr
    }
    compressedArr = []
    m = arr.length % maxSize
    bucketSize_min = Math.floor(arr.length / maxSize)
    bucket = 0
    bucket_len = 0
    for (i=0; i<arr.length; i++) {
      bucket += arr[i]
      bucket_len++;
      addon = (m>0) ? 1 : 0
      if (bucket_len >= bucketSize_min + addon) {
        compressedArr.push(bucket/bucket_len)
        bucket = 0
        bucket_len = 0
        m -= (m>0) ? 1 : 0;
      }
    }
    return compressedArr
  },

  zip2: function(arr) {
    util.assert(arr.length==2, "zip2 only accepts arrays of length 2")
    zipped = []
    arr[0].forEach((x, i) => {
      zipped.push([x, arr[1][i]])
    })
    return zipped
  },

  stringify: function (arr, decimals) {
    arr_str = "", set_str = ""
    for (set of arr) {
        for (coord of set) {
            // If Set is just [x,y] and not [[x1,x2],[y1,y2]]
            // there is no need to for extra brackets
            if (Array.isArray(coord)) {
                coord_str = coord.map(x => x.toFixed(decimals)).toString()
                set_str += "[" + coord_str + "],"
            } else {
                set_str += coord.toFixed(decimals).toString() + ","
            }
        }
        arr_str += "[" + set_str + "],"
        set_str = ""
    }
    return "[" + arr_str + "]"
  },
}