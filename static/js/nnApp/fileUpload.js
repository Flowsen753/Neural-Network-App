let fileUpload = {
	ui: {
		$file_input: $('#file-input'),
		$file_name: $("#file-name"),
		$file_validate: $('#file-validate'),
		$file_indicator: $('#file-indicator'),
		$file_msg: $('#file-msg'),
		$file_save: $('#file-save'),
		$upload_open: $('#upload_open')
	},
	data: {
		pending: {},
		valid: []
	},
	
	init: () => {
		util.hasLength(fileUpload.ui)
		fileUpload.ui.$upload_open.click(() => {
			fileUpload.reset()
		})
		fileUpload.ui.$file_save.click(() => {
			if (!fileUpload.data.valid.length) {
				return
			}
			$(document).trigger('fileUpload.saved', [fileUpload.data.valid])
		})
		fileUpload.ui.$file_input.change((ctx) => {
			fileUpload.loadJson(ctx)
		})
		fileUpload.ui.$file_validate.click(() => {
			fileUpload.validateAndParseJsonString(fileUpload.data.pending)
		})
	},
	
	reset: () => {
		fileUpload.ui.$file_msg.text("")
		fileUpload.ui.$file_validate.attr("disabled", true);
		fileUpload.ui.$file_save.attr("disabled", true)
		fileUpload.ui.$file_indicator.addClass("d-none")
	},
	
	loadJson: (ctx) => {
		fileUpload.reset()
		try {
			const file = ctx.target.files[0];
			console.log(file)
			fileUpload.ui.$file_name.text(file.name);
			var reader = new FileReader();
			reader.onload = function(e) {
				fileUpload.data.pending = e.target.result;
				fileUpload.ui.$file_validate.attr("disabled", false);	
			};
			reader.readAsText(file);
		} catch (error) {
			fileUpload.msg_negativ("Unable to load this file")
			return
		}
	},
  
	validateAndParseJsonString: (jsonString) => {
		fileUpload.ui.$file_msg.text("")
		fileUpload.ui.$file_save.attr("disabled", true)
		try {
			data = JSON.parse(jsonString)
		} catch (error) {
			fileUpload.msg_negativ("Unable to parse your file")
			return
		}
		try {
			util.assert(data.inputs.length > 0, "Json Loader: No Inputs")
			util.assert(data.labels.length > 0, "Json Loader: No Labels")
			util.assert(data.labels.length == data.inputs.length, "Inputs<->Labels size mismatch")
			zippedArr = util.zip2([data.inputs, data.labels])
			fileUpload.msg_positiv("Seems fine")
		} catch (error) {
			console.log(error)
			fileUpload.msg_negativ("Invalid format")
			return
		}
		fileUpload.data.valid = zippedArr
		fileUpload.ui.$file_save.attr("disabled", false)
	},
	
	msg_negativ: (msg) => {
		fileUpload.ui.$file_indicator.removeClass("d-none")
		fileUpload.ui.$file_indicator.removeClass("icon-thumbs-up text-success")
		fileUpload.ui.$file_indicator.addClass("icon-thumbs-down text-danger")
		fileUpload.ui.$file_msg.text(msg)
	},
	
	msg_positiv: (msg) => {
		fileUpload.ui.$file_indicator.removeClass("d-none")
		fileUpload.ui.$file_indicator.removeClass("icon-thumbs-down text-danger")
		fileUpload.ui.$file_indicator.addClass("icon-thumbs-up text-success")
		fileUpload.ui.$file_msg.text(msg)
	}
}