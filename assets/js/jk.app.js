var Tube = (function ($) {
    // 2016
    // @jessekorzan
    //
	var jk = {};
	jk.config = {
    	key : "AIzaSyDLeXJ9r25Yx7VM33h5FDQuZNlfZGixfE8"
	};
	jk.vars = {
    	stats : false,
    	totalFiltered : 0,
    	totalProcessed : 0,
    	totalMessages : 0,
    	txtFile : ""
	}
/* --------------------------------------------------	
-------------------------------------------------- */
    // INIT this f**ker
    jk.init = function () {
        jk.controller.ui();
        if ($(".layout-rankings").length > 0) { 
            jk.vars.stats = true;
        }
        jk.services.channelSearch();
        
    };
/* --------------------------------------------------	
-------------------------------------------------- */
	jk.pubSub = (function(){
		// David Walsh, genius advice
		// https://davidwalsh.name/pubsub-javascript
		var topics = {},
			hOP = topics.hasOwnProperty;
		return {
			subscribe: function(topic, listener) {
				// Create the topic's object if not yet created
				if(!hOP.call(topics, topic)) topics[topic] = [];
		
				// Add the listener to queue
				var index = topics[topic].push(listener) -1;
		
				// Provide handle back for removal of topic
				return {
					remove: function() {
						delete topics[topic][index];
					}
				};
			},
			publish: function(topic, info) {
				// If the topic doesn't exist, or there's no listeners in queue, just leave
				if(!hOP.call(topics, topic)) return;
		
				// Cycle through topics queue, fire!
				topics[topic].forEach(function(item) {
					item(info != undefined ? info : {});
				});
			}
		}
	})();
	jk.mustache = (function(){
    	var options = {};
    	
    	return {
        	output : function (options) {
			    var render = Mustache.to_html($(options.template).html(), options.data);
                $(options.container).append(render);
            }
		}
	})();
/* --------------------------------------------------	
-------------------------------------------------- */


    // ########################################
    // 
    // SERVICES
    //
    // ########################################
    jk.services = {
        process : function (options) {
            options = (typeof options !== "object") ? {} : options;
            
            $.ajaxSetup({ async: true, cache: false });
            $.ajax ({
                //dataType : "json",
                url: options.url,
                data: options.data,
                headers: {
                    "Authorization": options.authorization
                },
                success: function (data) { 
            		options.callBack(data);
            	},
                error: function(e) {
            	    console.error(e);
            	    $(".thread").append("<mark>" + e.responseText + "</mark>");
            	}
            });
        },
        liveChat : function (id, func) {
            
            var _options = {
                url : "https://www.googleapis.com/youtube/v3/liveChat/messages",
                authorization : "Bearer " + ACCESS_TOKEN,
                data : {
                    part : "id,snippet,authorDetails",
                    key :   jk.config.key,
                    liveChatId : id
                },
                callBack : func
            }
            jk.services.process(_options);
        },
        video : function (id) {
            
            var _options = {
                url : "https://www.googleapis.com/youtube/v3/videos",
                authorization : "Bearer " + ACCESS_TOKEN,
                data : {
                    part : "liveStreamingDetails, snippet, statistics, topicDetails",
                    id : id,
                },
                callBack : jk.views.detail
            }
            jk.services.process(_options);
        },
        stats : function (id) {
            
            var _options = {
                url : "https://www.googleapis.com/youtube/v3/videos",
                authorization : "Bearer " + ACCESS_TOKEN,
                data : {
                    part : "liveStreamingDetails, snippet, statistics, topicDetails",
                    id : id,
                },
                callBack : function (data_a) {
                    var _obj = {},
                        _item = data_a.items[0],
                        _liveChatID = _item.liveStreamingDetails.activeLiveChatId;
                    
                    function process (data_b) {
                        var _cnt = 0,
                            _ttl = 0;
                        
                        $.each(data_b.items, function(){
                            var _curr = this;
                            jk.vars.txtFile += _curr.snippet.displayMessage + "\n";
                            jk.vars.totalMessages += 1;
                            
                            
                            
                            SiftNinja.services.classify(_curr.snippet.displayMessage, 
                                function(data_c){
                                    var _this = $("#" + id);
                                    // this is the lamest part of the this...
                                    // updating display after EACH comment message goes through SIFT NINJA
                                    
                                    _ttl++;
                                    jk.vars.totalProcessed++;
                                    if (data_c[0] != undefined) {
                                        _cnt++;
                                        jk.vars.totalFiltered++;
                                        
                                        _this.addClass("alert");
                                        _this.find(".stats-filtered").html(_cnt);
                                        //_width = Math.floor((_cnt / _this.find(".stats-messages").html()) * 100);
                                        _width = Math.floor((_cnt / _this.find(".stats-messages").html()) * 100);
                                        _this.find(".stats-bar-a").css({"width" : _width + "%"}); 
                                        
                                        if (data_c.length > 0) {   
                                            _this.find(".stats-meta").prepend("<span class='" + data_c[0].risk + "'>" + data_c[0].tag + "</span>");
                                            
                                        }
                                    }
                                    
                                    _width = Math.floor((_ttl / _this.find(".stats-messages").html()) * 100);
                                    _this.find(".stats-bar-b").css({"width" : _width + "%"}); 
                                    
                                    $(".stats-totals.incidents").html("<span>" + jk.vars.totalFiltered + "</span>Incidents");
                                    $(".stats-totals.processed").html("<span>" + Math.floor((jk.vars.totalProcessed / jk.vars.totalMessages) * 100)  + "%</span>Sifted");
                                    $(".stats-totals.total").html("<span>" + jk.vars.totalMessages  + "</span>Samples");
                                }
                            );
                        
                        });
                        
                        //jk.vars.totalMessages += Number(data_b.items.length);
                        
                        _obj = {
                            items : {
                                id : _liveChatID,
                                viewers : _item.liveStreamingDetails.concurrentViewers,
                                likes: _item.statistics.likeCount,
                                messages : data_b.items.length,
                                filtered : 0
                                
                            }
                        }
                        jk.views.stats(_obj, id); 
                    }
                    
                    if (_liveChatID === undefined) {
                        process({
                            items : {}
                        });    
                    } else {
                        jk.services.liveChat(_liveChatID, process);
                    }
                }
            }
            jk.services.process(_options);
        },
        channelSearch : function () {
            // find list of LIVE events
            // https://developers.google.com/youtube/v3/docs/search/list
            
            var _options = {
                url : "https://www.googleapis.com/youtube/v3/search",
                authorization : "Bearer " + ACCESS_TOKEN,
                data : {
                    part : "id, snippet",
                    maxResults : 25,
                    chart : "mostPopular",
                    type : "video", 
                    order : "viewCount",
/*
                    regionCode : "US",
                    relevanceLanguage : "en",
*/
                    topicId : "/m/0403l3g", //gaming /m/0bzvm2
                    eventType : "live" //live, completed, upcoming
                    
                },
                callBack : jk.views.list
            }
            jk.services.process(_options);
        }
    };
    // ########################################
    // 
    // VIEWS
    //
    // ########################################
    jk.views = {
        list : function (data) {

            // generate display view
            jk.mustache.output({
                container : $(".video-list"),
                template : "#list",
                data : data
	        });
	        
	        var _vids = $(".btn-vid");
	        if (jk.vars.stats) {
    	        $.each(_vids, function(){
                    var _id = $(this).attr("id");
                    jk.services.stats(_id);
                });
	        }
	        
        },
        detail : function (data) {
            var _liveChatID = data.items[0].liveStreamingDetails.activeLiveChatId;
                                   
            data.items[0].liveStreamingDetails.concurrentViewers = Number(data.items[0].liveStreamingDetails.concurrentViewers).toLocaleString();
                               
            // show video deets
            $(".thread").html("");
            jk.mustache.output({
                container : $(".thread"),
                template : "#videoHeader",
                data : data
	        });
	        
            // comment thread
            if (_liveChatID === undefined) {
                $(".thread").append("<p><mark>Chat is disabled for this live stream.</mark></p>");
            } else {
                jk.services.liveChat(_liveChatID, jk.views.comments);
            }
        },
        stats :  function (data, id) {
            // add to detail card
            // video stream stats:
                // how many watching
                // ratings/risk/topics ,etc
            
            $("#" + id + " .stats").html("");
            
            jk.mustache.output({
                container : $("#" + id + " .stats"),
                template : "#stats",
                data : data
	        });
        },
        comments : function (data) {            
            // generate display view
            $.each(data.items, function(){
                jk.mustache.output({
                    container : $(".thread"),
                    template : "#comment",
                    data : {
                        message : this.snippet.textMessageDetails.messageText,
                        author : this.authorDetails.displayName
                               
                    }
    	        });
    	    });
    	    
    	    // decorate "bad" messages
	        $.each($(".chat p"), function() {
    	        var _this = $(this)
    	        function output (_arr, _hashes) {
        	        var _str = _this.html();
        	        
        	        if (_hashes != undefined) {
            	        _this.html("");
                	    jk.mustache.output({
                            container : _this,
                            template : "#sifted",
                            data : {
                                tags : _arr,
                                hashes : _hashes,
                                text : _str
                            }
                        });
                    }
        	    }
    	        SiftNinja.services.classify($(this).html(), output);
                
	        });
        },
    }
     // ########################################
    // 
    // CONTROLLER
    //
    // ########################################
    jk.controller = {
        ui : function () {
            var _vids = $(".btn-vid");
            
            $("body").on("click", ".btn-vid", function(e) {
                e.preventDefault();
                $(".channel").removeClass("on");
                $(this).addClass("on");
                
                $(".thread").html("<h1>Loading chat log</h1>");
                if ($("body").hasClass("layout-rankings")) {
                    $("body").removeClass("layout-rankings");
                    $("section").eq(0).animate({
                        scrollTop: $(this).position().top - 88
                    }, 500);
                }
                jk.services.video($(this).attr("id"));
            }); 
            
            $("body").on("click", ".close", function(e) {
                e.preventDefault();
                _vids.removeClass("on");
                $("body").addClass("layout-rankings");
                $(".thread").html("");
            }); 
            
            $("body").on("click", ".download", function(e) {
                var _textFile = null,
                    _data = new Blob([jk.vars.txtFile], {type: 'text/plain'});

                if (_textFile !== null) {
                  window.URL.revokeObjectURL(_textFile);
                }
                _textFile = window.URL.createObjectURL(_data);
                window.open(_textFile, '_blank');
            });
        }
    }
    return jk;
})(jQuery);
$(function () {
	
});