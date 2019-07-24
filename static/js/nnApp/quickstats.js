quickstats = {
  elements: [],
  content: [],

  init: (elements, options) => {
    quickstats._registerElements(elements)
    quickstats._injectOptions(options)
  },

  _registerElements: (elements) => {
      elements.forEach(element => {
          quickstats.elements.push(element)
    })
  },
  
  _injectOptions: (options) => {
    options.forEach((option, i) => {
      quickstats.content.push(
        $.extend(
          {val: 0, bigger: true, delta: "",
            deltaType: "abs", biggerIsBetter: true},
          option
        )
      )
    })
  },
  
  _show: () => {
    quickstats.elements.forEach((element, i) => {
      $indicator = element.children().children(".delta-indicator")
      $statCard = element.children(".statcard-number")
      $value = $statCard.children("span")
      if (!util.hasLength({$indicator, $statCard, $value})){
        return
      }
        
      content = quickstats.content[i]

      $value.text(content.val)
      $indicator.text(content.delta)

      $statCard.removeClass("text-success")
      $statCard.removeClass("text-danger")
      $indicator.removeClass("delta-positive")
      $indicator.removeClass("delta-negative")
      if ((content.bigger) == (content.biggerIsBetter)) {
          $statCard.addClass("text-success")
          $indicator.addClass("delta-positive")
      } else {
          $statCard.addClass("text-danger")
          $indicator.addClass("delta-negative")
      } 
    });
  },

  _updateSingle: (idx, val) => {
    util.assert(
      ((idx >= 0) && (idx < quickstats.content.length)),
      "quickstats.updateSingle: Index out of range"
    ) 
    stat = quickstats.content[idx]
    util.assert(
      ((typeof(val) != Number) || (typeof(stat.val) != Number)),
      "quickstats.updateSingle: Value type not a number"
    )

    oldValue = stat.val
    stat.val = val
    stat.bigger = (val > oldValue) ? true : false

    delta = val - oldValue
    delta_str = delta.toFixed(0)
    if (stat.deltaType == "percent") {
        if (Math.abs(oldValue)<util.eps) {
            delta_str = ""
        } else {
            ratio = val / oldValue
            delta_percent = (delta > 0) ? ratio : (1 - ratio)
            delta_str = (delta_percent * 100).toFixed(0) + "%"
        }
    }
    stat.delta = delta_str
  },

  reset: (values) => {
    values.forEach((value, i) => {
      quickstats._updateSingle(i, value)
      quickstats.content[i].delta = ""
    })
    quickstats._show()
  },

  update: (values) => {
    values.forEach((value, i) => {
      quickstats._updateSingle(i, value)
    })
    quickstats._show()
  }, 
}