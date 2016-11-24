var SiftNinja = (function ($) {
	var jk = {};
/* --------------------------------------------------	
-------------------------------------------------- */
    jk.services = {
        classify : function (txt, callBack) {
            var payload = {
                "async": true,
                "crossDomain": true,
                "url": "https://twohat.com/api/sift-ninja/marketing/",
                "method": "POST",
                "processData": false,
                "data": "{\n    \"text\": \"" + txt + "\",\n    \"user_id\": \"abc123\",\n    \"user_display_name\": \"filterBuster\",\n    \"language\": \"ee\",\n    \"context\": \"thread_271788\",\n    \"content_id\": 10000\n}"
            }
    
            $.ajax(payload).done(function (response) {
                var _arr = [],
                    _hashes = "";
              
                if (!response.response) {

                    if (response.hasOwnProperty("hashes")) {
                         _hashes = response.hashes[0].hashed;
                    }
                    if (response.hasOwnProperty("tags")) {
                        $.each(response.tags, function(index, element){
                            var _risk = "safe";
                                
                            if (element > 4/7) {
                                if (element == 5/7 ) {
                                    _risk = "mild"
                                }
                                if (element == 6/7) {
                                    _risk = "bad"
                                }
                                if (element == 7/7) {
                                    _risk = "severe"
                                }
                            }
                            
                            if (_risk != "safe") {
                                _arr.push({"tag" : index, "risk" : _risk});
                            }
                                
                        });
                    }
                    callBack(_arr, _hashes);
                } else {
                    callBack([]);
                }
                                
/*
                App.pubSub.publish("response", {
                    rsp : _arr,
                    str : (Object.keys(response.hashes).length != 0) ? response.hashes[0].hashed : ""
                });
*/
                
            }).fail(function() {
                    // "Ninja server was busy... try again."
            });
            
        }
            
    };	
/* --------------------------------------------------	
-------------------------------------------------- */
  	return jk;
})(jQuery);