import * as rpl from './replacer.js';

var script = null;

export default class Script extends Plugin {

    constructor(mods) {
        super();
        script = this;
        this.regex = null;
        this.mods = mods;
        this.words = {
			"hi": {
				replacement: "hi",
				stretchable: false,
				active: false
			},
			"lea": {
				replacement: "lea",
				stretchable: false,
				active: false
			},
			"bye": {
				replacement: "bye",
				stretchable: false,
				active: false
			},
			"how": {
				replacement: "how",
				stretchable: false,
				active: false
			},
			"why": {
				string: "why+",
				regex: /^why+$/i,
				replacement: "why",
				replacementParts: ["w", "h", "y"],
				stretchable: true,
				active: false
			},
			"wait": {
				string: "wa+it",
				regex: /^wa+it$/i,
				replacement: "wait",
				replacementParts: ["w", "a", "it"],
				stretchable: true,
				active: false
			},
			"sorry": {
				replacement: "sorry",
				stretchable: false,
				active: false
			},
			"meet": {
				replacement: "meet",
				stretchable: false,
				active: false
			},
			"thanks": {
				replacement: "thanks",
				stretchable: false,
				active: false
			},
			"what": {
				string: "wha+t",
			   	regex: /^wha+t$/i,
			   	replacement: "what",
				replacementParts: ["wh", "a", "t"],
				stretchable: true,
				active: false
			},
			"where": {
				replacement: "where",
				stretchable: false,
				active: false
			},
			"who": {
				replacement: "who",
				stretchable: false,
				active: false
			}
		};
    }

    prestart() {

		for (let word in this.words) {
	    	sc.OPTIONS_DEFINITION['word-changer-info-' + word] = {
		        cat: sc.OPTION_CATEGORY.GENERAL,
		        type: "INFO",
		        data: "options.word-changer-info-" + word + ".description"
		    };
			sc.OPTIONS_DEFINITION['word-changer-toggle-' + word] = {
				cat: sc.OPTION_CATEGORY.GENERAL,
				type: 'CHECKBOX',
				init: false,
				restart: false,
	    	};
		}

		var dialogListener = {
			init: function(a) {

				// If script.regex has not been loaded, try to load it
				// It could not have been loaded in prestart because sc.options is not defined there
				if (!script.regex && sc.options) {
					for (let word in script.words) {
			    		script.words[word].active = sc.options.values["word-changer-toggle-"+word];
			    	}
				    script.updateRegex();
				}
				if (a.person.person == "main.lea" && script.regex) {
					a.message.en_US = a.message.en_US.replace(script.regex,
						(match, offset, string) => rpl.replacer(match, offset, string, script.words));
				}
				this.parent(a);
			}
		};

		// SHOW_OFFSCREEN_MSG and SHOW_DREAM_MSG are afaik not used by Lea
		// I might add them later anyway
		ig.EVENT_STEP.SHOW_MSG.inject(dialogListener);
		ig.EVENT_STEP.SHOW_SIDE_MSG.inject(dialogListener);
    }

    main() {
    	for (let word in this.words) {
    		let replacement = sc.options.values["word-changer-info-"+word] || word;
			initReplacement(word, replacement, this.words);
	    }
    	sc.Model.addObserver(sc.options, {
    		modelChanged: function() {
    			var words = script.words;
    			for (let word in words) {
    				let option = sc.options.values["word-changer-toggle-"+word];
    				if (option && !words[word].active) {
    					words[word].active = true;
    					if (sc.menu.directMenu == 8) { // if in menu
    						getReplacement(word, words[word].replacement, words);
    						script.updateRegex();
    					}
    				} else if (!option && words[word].active) {
    					words[word].active = false;
    					script.updateRegex();
    				}
    			}
    		}
    	});
    }

    updateRegex() {
    	var result = "(?:";
    	for (const word in this.words) {
    		if (!this.words[word].active) {
    			continue;
    		}
    		if (!this.words[word].stretchable) {
    			result += word + "|";
    		} else {
    			result += this.words[word].string + "|";
    		}
    	}
    	if (result == "(?:") {
    		this.regex = /(?!)/gi;
    		return;
    	}
    	result = result.substring(0, result.length - 1) + ")";
    	this.regex = new RegExp(result, "gi");
    }
}

function initReplacement(original, replacement) {
	script.words[original].replacement = replacement;
	if (script.words[original].stretchable) {
		script.words[original].replacementParts = rpl.splitReplacement(replacement);
	}

	let toggletext = 'Replace "' + original + '"';
	let infotext = 'Current replacement for "' + original + '": ' + replacement;

	ig.lang.labels.sc.gui.options['word-changer-toggle-' + original] = {
		name: toggletext,
		description: "Tick to replace this word with another."
	};

	ig.lang.labels.sc.gui.options['word-changer-info-' + original] = {
		description: infotext
	};
}

function getReplacement(original, prevReplacement) {
	if(window.ig && window.ig.system){
		// I've chosen the gamecodeMessage overlay because it's in the format I want
	    var overlay = ig.dom.html('<div class="gameOverlayBox gamecodeMessage" ><h3>Enter replacement for "' + original + '"</h3></div>');
	    var form = ig.dom.html('<form><input type="text" name="replacement" value="' + prevReplacement + '" /><input type="submit" name="send" value="Submit" /><form>');
	    overlay.append(form);
	    form.submit(function(){
	        let replacement = form[0].replacement.value.toLowerCase() || original;
	        updateReplacement(original, replacement);
	        ig.system.regainFocus();
	        return false;
	    });

	    $(document.body).append(overlay);
	    window.setTimeout(function(){
	        overlay.addClass("shown");
	    }, 20);
	    ig.system.setFocusLost();

	    var close = function(){
	        overlay.remove();
	    }
	    ig.system.addFocusListener(close);
	    form.find("input[type=text]").focus();
	}
};

function updateReplacement(original, replacement) {

	script.words[original].replacement = replacement;
	if (script.words[original].stretchable) {
		script.words[original].replacementParts = rpl.splitReplacement(replacement);
	}

	var infotext = 'Current replacement for "' + original + '": ' + replacement;

	sc.options.values["word-changer-info-" + original] = replacement;
	ig.lang.labels.sc.gui.options['word-changer-info-' + original].description = infotext;
	var options = sc.menu.guiReference.submenus.options.listBox.rows;
	for (let ind in options) {
		// The code below relies on the info box being directly above the toggle option.
		// This has been the only way I've found to find the correct info box.
		if (options[ind].optionName == "word-changer-toggle-" + original) {
			options[ind-1].text.setText(infotext);
            break;
		}
	}
}