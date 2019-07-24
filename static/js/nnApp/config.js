var config = {
  ui: {
    $open: $("#settings_open"),
    $save: $("#settings_save"), 
    $hiddenlayer: $("#network_layer").children("input"),
    $nodes: $("#network_nodes").children("input"),
    $epochsPerRun: $("#epochsPerRun").children("input"),
    $activations: $("#activation").find("input:radio"),
    $norms: $("#normFcn"),
    $losses: $("#lossFcn"),
    $optimizer: $("#optimizer"),
    $batchSize_sliderParent: $("#batchSize_sliderParent"), 
    $lr_sliderParent: $("#lr_sliderParent"), 
  },
  default_values: {
    numLayers:4,
    nodesPerLayer:21,
    activation:"relu",
    epochsPerRun:500,
    lr:0.001,
    batchSize:30,
    optim:"sgd",
    loss:"mse",
    norm:"minMax"
  }, 
  val: {},


  init: () => {
    util.hasLength(config.ui) 
    config.val = config.default_values
    config.ui.$open.click(config.show);

    config.ui.batchSize = config.ui.$batchSize_sliderParent.children("input").slider();
    config.ui.batchSize.slider('on', 'slide', () => {
      currentVal = config.ui.batchSize.slider('getValue')
      config.ui.$batchSize_sliderParent.children("span").text(" "+currentVal+" %")
    })
    config.ui.lr = config.ui.$lr_sliderParent.children("input").slider();
    config.ui.lr.slider('on', 'slide', () => {
      currentVal = config.ui.lr.slider('getValue')
      config.ui.$lr_sliderParent.children("span").text(" 1e"+currentVal)
    }) 

    config.ui.$save.click(config.save);
  },
  
  show: () => {
    // Get the exponent of the lr because slider cant handle floats
    let digit = config.val.lr
    let exp = 0
    while(digit < 1){
      digit *= 10;
      exp++;
    }

    config.ui.batchSize.slider('setValue', config.val.batchSize, true, true)
    config.ui.lr.slider('setValue', -exp, true, true)
    config.ui.$hiddenlayer.val(config.val.numLayers-2)
    config.ui.$nodes.val(config.val.nodesPerLayer)
    config.ui.$activations.each((i, ele) => {
      $(ele).prop("checked", ($(ele).val() == config.val.activation))
    })
    config.ui.$norms.val(config.val.norm); 
    config.ui.$losses.val(config.val.loss); 
    config.ui.$optimizer.val(config.val.optim)
    config.ui.$epochsPerRun.val(config.val.epochsPerRun)
  },

  save: () => {
    const activation = jQuery.grep(config.ui.$activations,(n,i) => {
        return ($(n).prop("checked"))
    })

    // Check and Correct
    try {
      let numLayers = eval(config.ui.$hiddenlayer.val())+2
      numLayers = (numLayers < 3) ? 3 : numLayers
      let nodesPerLayer = eval(config.ui.$nodes.val())
      nodesPerLayer = (nodesPerLayer < 1) ? 1 : nodesPerLayer
      let epochsPerRun = eval(config.ui.$epochsPerRun.val())
      epochsPerRun = (epochsPerRun < 1) ? 1 : epochsPerRun 
      epochsPerRun = (epochsPerRun > 5000) ? 5000 : epochsPerRun 

      config.val = $.extend(config.default_values, {
      numLayers: numLayers,
      nodesPerLayer: nodesPerLayer,
      activation: $(activation).val(),
      epochsPerRun: epochsPerRun,
      lr: Math.pow(10, eval(config.ui.lr.slider('getValue'))),
      batchSize: eval(config.ui.batchSize.slider('getValue')),
      optim: config.ui.$optimizer.children("option:selected").val(),
      loss: config.ui.$losses.children("option:selected").val(),
      norm: config.ui.$norms.children("option:selected").val()
      }) 
    } catch {
      config.val = config.default_values
    }
    $(document).trigger("settings.saved")
  },
}