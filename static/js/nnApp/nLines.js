var nLines = {

  init: function (element) {
    var attrData = $.extend({}, $(element).data())
    var name           = $(element).attr('data-name')

    var data           = attrData.dataset        ? eval(attrData.dataset) : []
    var datasetOptions = attrData.datasetOptions ? eval(attrData.datasetOptions) : []
    var labels         = attrData.labels         ? eval(attrData.labels) : {}
    var options        = attrData.options        ? eval('(' + attrData.options + ')') : {}
    var isDark         = !!attrData.dark

    var data = {
      datasets : data.map(function (set, i) {
        return $.extend({
          data: set,
          fill: true,
          // backgroundColor: isDark ? 'rgba(28,168,221,.03)' : 'rgba(66,165,245,.2)',
          backgroundColor: isDark ? 'rgba(28,168,221,.03)' : 'rgba(255,255,255,.2)',
          borderColor: '#42a5f5',
          borderWidth: 1,
          //pointBorderColor: 'rgba(28,168,221,.9)',
          lineTension: 0.55,
          pointRadius: 3,
          pointStyle: 'circle',
          pointHoverRadius: 4,
		  pointHoverBackgroundColor: 'grey',
          pointHitRadius: 5
        }, datasetOptions[i], {label: labels[i]})
      })
    }

    Charts._cleanAttr(attrData)

    var options = $.extend({
      maintainAspectRatio: false,
      animation: {
          duration: 1000
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
            usePointStyle: false
        }
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
        bodyFontSize: 12,
        callbacks: {
          title: function () { return "" },
          labelColor: function () {
            return {
              backgroundColor: '#6c757d',
              borderColor: '#6c757d'
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
  
  enableTooltips: function(handle, enable) {
	handle["options"]["tooltips"].enabled = enable;
  },

  update: function (handle, lineID, newDatasets) {
    //chart.dataset.data = [{x:, y:}, {x:, y:}]
    lineID = Array.isArray(lineID) ? lineID : [lineID]
    if (lineID.length != newDatasets.length){
        console.log("nLines.update: arr len differences")
        return
    }
    newDatasets.forEach((set, k) => {
      if (lineID[k] < handle.data.datasets.length){
        handle.data.datasets[lineID[k]]["data"] = set.map((x) => x)
      }
    });

    handle.update()
  },

  change: function(handle, lineID, newData, options) {
    if (lineID >= handle.data.datasets.length){
      console.log("nLines.change: id exceeds number of lines")
    }
	try {
		const check = handle.lineID.initial.isThere
	} catch (notThere) {
		handle.lineID = {initial: $.extend({isThere: true}, handle.data.datasets[lineID])}
	}
    let newDataset = $.extend(handle.data.datasets[lineID], options)
    newDataset["data"] = newData.map((x) => x)
    handle.data.datasets[lineID] = newDataset

    handle.update() 
  },

  toInitial: function(handle, lineID) {
    if (lineID >= handle.data.datasets.length){
      console.log("nLines.resetStyle: id exceeds number of lines")
    } 
	try {
		const check = handle.lineID.initial.isThere
		initial = $.extend({}, handle.lineID["initial"])
		handle.data.datasets[lineID] = initial
		delete handle.lineID.initial
	} catch (noInitial) {
	}
    handle.update() 
  }

}