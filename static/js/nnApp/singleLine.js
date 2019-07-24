var singleLine = {

  init: function (element) {
    var attrData = $.extend({}, $(element).data())

    var data           = attrData.dataset        ? eval(attrData.dataset) : []
    var datasetOptions = attrData.datasetOptions ? eval(attrData.datasetOptions) : []
    var labels         = attrData.labels         ? eval(attrData.labels) : {}
    var options        = attrData.options        ? eval('(' + attrData.options + ')') : {}
    var isDark         = !!attrData.dark

    var data = {
      datasets : data.map(function (set, i) {
        return $.extend({
          data: set.map((x) => x),
          fill: true,
          showLine: true,
          backgroundColor: isDark ? 'rgba(28,168,221,.03)' : 'rgba(66,165,245,.2)',
          borderColor: '#42a5f5',
          borderWidth: 3,
          pointBorderColor: '#fff',
          lineTension : 0.75,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHitRadius: 20
        }, datasetOptions[i], {label: labels[i]})
      })
    }

    Charts._cleanAttr(attrData)

    var options = $.extend({
      maintainAspectRatio: false,
      animation: false,
      legend: {
        display: true
      },
      scales: {
        yAxes: [{
        gridLines: {
            color: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)',
            zeroLineColor: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)',
            drawBorder: false
        },
        ticks: {
            maxTicksLimit: 6,
            fontColor: isDark ? '#a2a2a2' : 'rgba(0,0,0,.4)',
            fontSize: 14
        }
        }],
        xAxes: [{
        gridLines: {
            display: false,
            color: 'rgba(0,0,0,.005)',
            zeroLineColor: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)',
        },
        ticks: {
            maxTicksLimit: 7,
            fontColor: isDark ? '#a2a2a2' : 'rgba(0,0,0,.4)',
            fontSize: 14
        }
        }]
      },
      tooltips: {
        enabled: true,
        bodyFontSize: 14,
        callbacks: {
          title: function () { return "" },
          labelColor: function () {
            return {
              backgroundColor: '#42a5f5',
              borderColor: '#42a5f5'
            }
          }
        }
      }
    }, options)

    const chartHandle =  new Chart(element.getContext('2d'), {
            type: 'scatter',
            data: data,
            options: options
        })
    
    return chartHandle
  },

  update: function (handle, newData) {
      //dataset.data = [{x:, y:}, {x:, y:}]
      //datasets[0] because its a single line chart 
      handle.data.datasets[0]["data"] = newData.map((y, i) => {
        return {x: i, y: y}
      })
      handle.update()
       
  },

  add: function (handle, newData) {
    //newData = [123]
    //chart.dataset.data = [{x:, y:}, {x:, y:}]
    //datasets[0] because its a single line chart 
    handleData_len = handle.data.datasets[0]["data"].length
    newData.forEach((val, i) => {
      handle.data.datasets[0]["data"].push({x: handleData_len + i,y: val})
    })
    handle.update()
  },

  changeLabel: (handle, newLabel) => {
    handle.data.datasets[0]["label"] = newLabel
    handle.update()
  },

  getYData: function(handle) {
    //chart.dataset.data = [{x:, y:}, {x:, y:}]
    //datasets[0] because its a single line chart 
    return handle.data.datasets[0]["data"].map(function (set) {
      return set["y"]
    })
  }
}