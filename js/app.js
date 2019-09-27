var videoCache = [];
function gatherVideos() {
    var selectedValues = $('#vodlist').val();
    if (selectedValues.length == 0) {
        alert("You must select at least one video channel.");
        return false;
    }

    if (videodate.value == "") {
        alert("You must select a date.");
        return false;
    }

    getVideos.disabled = true;
    dtVideos.clear().draw(true);
    selectedValues.forEach(source => {
        $.ajax({
            method: "GET",
            url: source,
            async: true,
            cache: false,
            accepts: "application/json",
            contentType: "application/json",
            success: function(data,textStatus,xhr) {
                getVideos.disabled = false;
                //get the featured video
                var videos = data.videos;
                if (data.featuredVideo != null) {
                    videos.push(data.featuredVideo);
                }
                
                //Filter videos by selected date
                videos = filterByDate(videos, videodate.value);
                
                //Select the channel name by the value in select
                videos.forEach(video => {
                    AddRow(video);
                });
            },
            error: function(xhr,textStatus,errorThrown) {
                getVideos.disabled = false;
                alert("Error!: " + "Status:" + textStatus + " | Details: " + JSON.stringify(errorThrown));
            },
          });
    });
}

function AddRow(video) {
    dtVideos.row.add(["<img style='margin-top:20px;' src='" + video.posterThumbnailUrl + "'/>", video.title, video.summary, getChannelName(video.channel),moment(video.createdAt).local().format("YYYY-MM-DD"), video.directUrl, video.posterLargeUrl,""]).draw( true);
}

function addPageid() {
    var newid = prompt("Enter a Page ID that you want to post to. \r\nUse 'me' if you want to post to your personal news feed.", "me");
    if (newid != null) {        
        var option = document.createElement("option");
        option.text = newid;
        document.getElementById("pageid").add(option);
    }

    savePageIDs();
}

function savePageIDs() {
    var pageIds = [];
    $("#pageid option").each(function() {
        pageIds.push($(this).val());
    });

    setCookie("pageid_cookie",pageIds,1000);
}

function removePageid() {
    $("#pageid option:selected").remove();
    savePageIDs();
}

var FacebookEndpoint = "https://graph.facebook.com/v3.2/";
function TestAPI() {
    if (validateForm() == false) {
        return false;
    }

    var data = {message:"This is a test", attached_media:null, link:null };
    var pageid_val = $("#pageid option:selected").val();

    $.ajax({
        method: "POST",
        url: FacebookEndpoint + pageid_val + "/feed?access_token=" + accesskey.value,
        data: data,
        async: true,
        cache: false,
        accepts: "application/json",
        contentType: "application/json",
        success: function(data,textStatus,xhr) {

            alert("Post successful! " + JSON.stringify(data));
        },
        error: function(xhr,textStatus,errorThrown) {
            if (xhr.responseText == undefined) {
                alert("Error!: " + "Status:" + textStatus + " | Details: " + JSON.stringify(errorThrown) + "Likely an invalid Access Key.");
                return false;
            }
            var fb_response = JSON.parse(xhr.responseText);
            alert("Error!: " + "Status:" + textStatus + " | Details: " + JSON.stringify(errorThrown) + "\r\n" + "Facebook:" + fb_response.error.message + "\r\n" + fb_response.error.error_user_msg);
        },
      });
}

function uploadVideos() {
    if (validateForm() == false) {
        return false;
    }

    //e.preventDefault();
    var form = $('#frmPostVideo')[0];
    var totalvids = dtVideos.rows({selected: true}).data().length;
    if (totalvids == 0) {
        alert("You must select at least one video to post");
        return false;
    }
    var currentvideo = 1;
    var successful = 0;
    var errors = 0;
    $("#toolstatus").html("Posting video 1 of " + totalvids);

    var incices = dtVideos.rows({selected: true})[0];
    $.each(incices, function(itt, index) {
        //get row by index...
        var d = dtVideos.row(index).data();
        form.title.value = d[1];
        form.description.value = d[2];
        form.file_url.value = d[5];
        var thumbnailurl = d[6];

        d[7] = "processing";
        dtVideos.row(index).invalidate().draw();
        var data = new FormData(form);
        var pageid_val = $("#pageid option:selected").val();

        //Download thumbnail - Get a thumbnail image and assign to blob
        //USE A RELAY PHP SCRIPT ON YOUR SERVER TO FETCH AND RETURN...PASS URL AS PARAMETER
        var promise1 = new Promise(function(resolve, reject) {
            var oReq = new XMLHttpRequest();
            var url = "getThumbnail.php?url=" + thumbnailurl;
            oReq.open("GET", url, true);
            oReq.responseType = "blob";
            oReq.onload = function(oEvent) {
                var blob = oReq.response;
                data.append("thumb", blob);
                $.ajax({
                    url: FacebookEndpoint + pageid_val + "/videos?access_token=" + accesskey.value,
                    data: data,
                    cache: false,
                    contentType: false,
                    processData: false,
                    method: 'POST',
                    type: 'POST', // For jQuery < 1.9
                    success: function(data,textStatus,xhr) {
                        successful++;
                        currentvideo++;
                        ShowToolStatus(currentvideo, totalvids, successful, errors);
                        resolve([true,"Posted Successfully!"]);
                        console.log("SUCCESS!");
                    },
                    error: function(xhr,textStatus,errorThrown) {
                        errors++;
                        currentvideo++;
                        ShowToolStatus(currentvideo, totalvids, successful, errors);
                        if (xhr.responseText == undefined) {
                            resolve([false,"Error!: " + "Status:" + textStatus + " | Details: " + JSON.stringify(errorThrown) + "Likely an invalid Access Key."]);
                            // return false;
                        } else {
                            var fb_response = JSON.parse(xhr.responseText);
                            resolve([false,"Error!: " + "Status:" + textStatus + " | Details: " + JSON.stringify(errorThrown) + "\r\n" + "Facebook:" + fb_response.error.message + "\r\n" + fb_response.error.error_user_msg]);
                        }
                        
                    }
                });
            };
            oReq.send();
        });
        promise1.then(function(result) {
            d[7] = result[1];
            dtVideos.row(index).invalidate().draw();
        });
    });
}

function ShowToolStatus(currentvideo, totalvids, successful, errors) {
    if (currentvideo <= totalvids) {
        $("#toolstatus").html("Posting video " + currentvideo + " of " + totalvids);
    } else {
        if (errors == 0)  {
            $("#toolstatus").html(successful + " videos posted successfully of " + totalvids);
        } else {
            if (errors == totalvids) {
                $("#toolstatus").html("An error occured, check settings");
            }
        }
        setTimeout(function() { $("#toolstatus").html(""); }, 10000);
    }
}

function validateForm() {
    //You must have an access key
    if (accesskey.value == "") {
        alert("You must enter an access key!");
        return false;
    }

    //You must have a page id    
    if ($("#pageid option:selected").length == 0) {
        alert("You must select at least one page id!");
        return false;
    }
}

function getChannelName(channelId){
    return $("#vodlist option[value*=" + channelId + "]").html();
}

//work on this and perhaps use moment if you have to.
//check dates in local time
function filterByDate(videos, date) {
    filteredVideos = [];
    videos.forEach(element => {
        var selectedDate = moment(date).format("YYYY-MM-DD");
        var videoDate = moment(element.createdAt).local().format("YYYY-MM-DD");
        if (selectedDate == videoDate) {
            filteredVideos.push(element);
        }
    });
    return filteredVideos;
}

function setCookie(c_name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
    var i, x, y, ARRcookies = document.cookie.split(";");
    for (i = 0; i < ARRcookies.length; i++) {
        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
        x = x.replace(/^\s+|\s+$/g, "");
        if (x == c_name) {
            return unescape(y);
        }
    }
}
