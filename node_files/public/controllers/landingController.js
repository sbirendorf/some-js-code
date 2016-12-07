function contStartLandingTest() {
    ui.displayMsgRight("Step on the plate.", false);
    ui.BtnsEnableControll(['landing','stop']);
    var userWeight =[];
    var getWeight = setInterval(function () {
        if (globals.currentWeight > 3) {
            ui.displayMsgRight("Stand Still.", false);
            if ($$(".stop-btn").is(":disabled") == true) {
                clearInterval(getWeight);
            }// if the user canceld the test , stop the interval
            var avgWeight = weightCalc(getWeight,userWeight);
            if(avgWeight>3){
                setTimeout(function(){  startLandingOperator(avgWeight); }, 3000);
            }
        }
    }, 200);
}
function weightCalc(getWeight,userWeight){
    userWeight.push(globals.currentWeight);
    if(userWeight.length > 10 ){
       var max = Math.max.apply(null, userWeight);
       var min = Math.min.apply(null, userWeight);  
        if(max - min <1){
            var sum = 0;
            var ww = userWeight.length;
            for( var i = 0; i < ww; i++ ){
                sum += parseInt( userWeight[i], 10 ); //don't forget to add the base
            }
            var avgWeight = sum/ww;
            clearInterval(getWeight); 
            ui.displayMsgRight("Step off the plate. ", false);
            return avgWeight;
        }
        userWeight.shift(); // remove the first key from the array
    }  
}
function startLandingOperator(userWeight) {
    $$(".log-msg").empty();
    globals.landingInitWeight = userWeight;
    var str = setInterval(function () {
        if (globals.currentWeight < 2) {
            var audio = new Audio('../horn.mp3');
            audio.play();
            var side = ui.getSide(globals.landingTestNumber);
            ui.displayMsgRight("Jump onto the plate, land on your " + side + " foot", false);
            ui.displayMsg('Trials Remaining :' + globals.landingTestNumber);
            startLanding(userWeight);
            clearInterval(str);
            t = 0;
            globals.stopChart = false;
            startLandingRealTimeChart();
            $$("#sway").show();
            $$("#scan").hide();
            stratLandingTest();
        }
    }, 2500);
}
//check when the user back on the plate , than start the counter to stop the test
function stratLandingTest() {
    var str = setInterval(function () {
        if (globals.currentWeight > 5) {
            globals.flag = true;
            clearInterval(str);
        }
    }, 500);
}
function validateLandingResult(data) {
    return false;
}

//landing results 
function singleLegLandingResult(data) {
    var invalid = validateLandingResult(data);
    if (invalid) {
        var audio = new Audio('../error.mp3');
        audio.play();
    } else {
        data.side = ui.getSide(globals.landingTestNumber);
        data.Date =getCurrentDateTime();
        var testInitWeight = data.Input.WeightKG;
        //if pounds convert the weight, notich the object name still WeightKG
        data.WeightKG = ui.convertWeight(data.Input.WeightKG);
        var data = JSON.stringify(data);
        localStorage.setItem("Sparta_landing_" + globals.landingTestNumber+ '_' + globals.testGUID, data);
        console.log(localStorage['Sparta_landing_' + globals.landingTestNumber+ '_' + globals.testGUID]);
        var q = jQuery.parseJSON(localStorage['Sparta_landing_' + globals.landingTestNumber+ '_' + globals.testGUID]);
        globals.landingTestNumber--;
                ui.displayMsg('Trials Remaining :' + globals.landingTestNumber);
    }
    //test again 
    if (globals.landingTestNumber > 0) {
        setTimeout(function () {
            ui.displayMsgRight("Loading", false);
            drawData = true;
            startLandingOperator(testInitWeight);
        }, 2500);
    } else {//test is over 
        ui.displayMsgRight("", false);

        var r = confirm("Test Over! Send data to sparta Trac?");
        if (r == true) {
            sendDataToTrac('landing');
        }
         ui.displayMsgRight("", false);
         globals.landingTestNumber = globals.initLandingTestNumber;
    }
}

function landingProgress(obj) {
    //we want to be here once, so we set the flag to true
    if (obj.Status == 'protocolinprogress' && globals.flag == true) {
        globals.flag = false;
        if(obj.WeightKG >1){
            var a  = Math.pow(obj.FY, 2) + Math.pow(obj.FX, 2) + Math.pow(obj.FZ, 2) ; 
            a = Math.sqrt(a)/ 9.81;
            var f = obj.WeightKG * a;
            var precentBW = f/globals.landingInitWeight;
            console.log(precentBW);
            //if the landing did not reach the min force
            if(precentBW < globals.landingMinForce){
                stopDuringTesting('ABORT');
                //overwrite the error from the websocket, wait to show after
                setTimeout(function () {
                     ui.setMsg("Test failed, no trial if peak force is less that "+globals.landingMinForce+"% of BW in N", true);
                }, 250);
            }
            
        }
         //the user is on the plate , wait 3 sec and send a message 
        setTimeout(function () {
            ui.displayMsgRight("Step off the plate.", false);
            var audio = new Audio('../stop.mp3');
            audio.play();
            globals.stopChart = true;
        }, 3000);
    }
}

//function for the weight test
function contStartWeightTest() {
    ui.displayMsgRight("Step on the plate.", false);
    ui.BtnsEnableControll([]);
    var userWeight =[];
    $$("#temp_div").show();
    $$("#cop1_div").hide();
    $$(".msg-area2").hide();
    $$("#scan").hide();
    var getWeight = setInterval(function () {
        if (globals.currentWeight > 3) {
            ui.displayMsgRight("Stand Still.", false);
            var avgWeight = weightCalc(getWeight,userWeight);
            if(avgWeight == null){avgWeight = 0;}
            $$("#temp_div").empty();
            avgWeight = ui.convertWeight(avgWeight);
            var stopBtn = '<button class="stop-weight-btn btn btn-danger" style="width: 120px;margin-top: 95px;" onClick="stopWeightTest();">Stop Weight</button> <button class="stop-weight-btn btn btn-primary" style="width: 120px;margin-top: 95px;" onClick="sendWeightToTrac('+avgWeight.toFixed(1)+');">Save Weight</button><br><br>';
            $$("#temp_div").append("<div class='weight-test'>" + avgWeight.toFixed(1) + "</div>");
            $$("#temp_div").append(stopBtn);
        }
    }, 100);
}
function stopWeightTest() {
    $$("#temp_div").empty();
    ui.displayMsgRight("", false);
    clearInterval(globals.weightTest);
    ui.BtnsEnableControll(['scan','sway','landing','weight']);
    $$("#temp_div").hide();
    $$("#cop1_div").show();
    $$(".msg-area2").show();
}
function sendWeightToTrac(weight) {
 var d = new Date();
 var year = d.getFullYear();
 var month = ("0" + (d.getMonth() + 1)).slice(-2);
 var day = ("0" + d.getDate()).slice(-2);
 var mins = ("0" + d.getMinutes()).substr(-2);
 var hours = ("0" + d.getHours()).substr(-2);
 d= year+"-"+month+"-"+day+" "+hours+":"+mins+":00";
  var data = {"Date": d,"uid": globals.testGUID,"value": weight};
  data = JSON.stringify(data);              
    $$.ajax({
        type: 'POST',
        url: "/api/post/save_weight",
        data: {"data": data},
        success: function (result) {
            ui.displayMsgRight('Weight saved', false);
        },error: function (result) {
            var result = jQuery.parseJSON(result);
            console.log(result);
            ui.setMsg('Failed to save weight', true);
        }
    });
}
