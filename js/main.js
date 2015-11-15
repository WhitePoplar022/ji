/*****
 * 
 * @author fiona23 https://github.com/fiona23  fiona_fanmy@163.com
 *
 **/


$(document).ready(function() {
    $('#fullpage').fullpage();
});


var taskList = angular.module('taskList', ['LocalStorageModule']); 

taskList.config(function (localStorageServiceProvider) {
  localStorageServiceProvider
    .setPrefix('taskList')
    .setStorageType('localStorage')
    .setNotify(true, true)
});



taskList.service('AllItem', [$rootScope, function ($rootScope) {
    var allTasks = [];
    // $rootScope.allTasks = allTasks;

    var service = {
        allTasks: [],

        addTask: function  (task) {
            this.allTasks.push(task);
            $rootScope.$broadcast('allTasks.update');
        }
    }


    return service;
}])

var allPlans = [];
// var allTasks = [];


/* 
 * prototype of daily task list and long term plan
 * contain followin methods:
 * @delete() @edit() @cancelEdit() @finishEdit()
 * 
 */
taskList.factory('AddedItem', function (localStorageService) {
    function AddedItem () {
        
    }

    AddedItem.prototype.delete = function(all) {
        var sure = confirm('确定删除吗？');
        if (!sure) {
            return;
        };

        var id = this.id;

        if (all === 'allPlans') {
            allPlans[id] = {};
            localStorageService.set(all, allPlans);
        }
        else if(all === 'allTasks') {
            allTasks[id] = {};
            localStorageService.set(all, allTasks);
        }
    }



    AddedItem.prototype.edit = function (event, type) {
        var target = event.target;
        var item = $(findParent(target, 'data-' + type))

        var itemShow = item.find('.item-content');

        var editWrapper = item.find('.edit-wrapper');
        var itemInput = item.find('.edit-item-input');

        editWrapper.removeClass('invisible');
        itemShow.addClass('invisible');
    }

    AddedItem.prototype.cancelEdit = function (event, type) {
        var item = $(findParent(event.target, 'data-' + type))

        var editWrapper = item.find('.edit-wrapper');
        var itemShow = item.find('.item-content');

        editWrapper.addClass('invisible');
        itemShow.removeClass('invisible');
        item.find('.edit-item-input').val(this.content);
    }

    AddedItem.prototype.finishEdit = function (event, type) {
        var item = $(findParent(event.target, 'data-' + type))
        var content = item.find('.edit-item-input').val();
        var id = this.id;

        if (!content) {
            alert(type+'不能为空哦');
            return;
        };

        if (type === 'task') {
            allTasks[id].taskName = content;
            allTasks[id].content = content;
            localStorageService.set('allTasks', allTasks);
        }
        else if(type === 'plan') {
            allPlans[id].content = content;
            this.checkPlanContent();
            this.updateFinishConShow();
            this.updateBar();
            localStorageService.set('allPlans', allPlans);
        }


        var editWrapper = item.find('.edit-wrapper');
        var itemShow = item.find('.item-content');

        editWrapper.addClass('invisible');
        itemShow.removeClass('invisible');
    }


    function findParent (child, dataProp) {
        var parentNode = child;

        while (parentNode.getAttribute && !parentNode.getAttribute(dataProp)) {
            parentNode = parentNode.parentNode;
        }

        return parentNode
    }

    return AddedItem;
})


taskList.factory('Task', function (localStorageService, AddedItem) {
    function Task (id, name, date) {
        //if input is object get from localstorage
        if (!name && !date && id instanceof Object) {
            for (prop in id){
                this[prop] = id[prop];
                //change taskName to content
                this.content = id.taskName
            }

            return;
        }

        this.id = id;
        this.taskName = name;
        this.content = name;
        this.finishCon = {};

        startYear = date.getFullYear();
        startMonth = date.getMonth();

        this.startYM = '' + startYear + startMonth
        this.startDay = date.getDate() - 1;
        //init finishCon: {startMonth: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']}
        this.finishCon[this.startYM] = new Array(parseInt(this.startDay) + 1 ).join('-').split('');
    }

    Task.prototype = new AddedItem();
    Task.prototype.constructor = Task;

    return Task;
})

taskList.factory('Plan', function (localStorageService, AddedItem) {
    function Plan (startDate, endDate, planContent) {
        //if input is object get from localstorage
        if (!endDate && !planContent && startDate instanceof Object) {
            for (prop in startDate){
                this[prop] = startDate[prop];
            }

            return;
        }

        // this.startDate = startDate;
        // this.endDate = endDate;
        this.content = planContent;

        this.startDateYear = startDate[2];
        this.startDateMon = startDate[0];
        this.startDateDay = startDate[1];

        this.endDateYear = endDate[2];
        this.endDateMon = endDate[0];
        this.endDateDay = endDate[1];

        this.finishCon = 0;
        this.finishConShow = '0';
        this.timeThrough = 0;

        //calculate time span of the plan
        this._startDate = new Date(this.startDateYear, this.startDateMon-1, this.startDateDay);
        this._endDate = new Date(this.endDateYear, this.endDateMon-1, this.endDateDay);

        this.timeSpan = calculateTimeSpan(this._startDate, this._endDate);

        var currentDate = new Date();
        var timeThrough = calculateTimeSpan(this._startDate, currentDate);
        this.timePassedPerc = timeThrough / this.timeSpan;

        // //check plan content
        // var planQuantization = checkPlanContent(planContent).planQuantization;
        // if (planQuantization) {
        //     this.planQuantization = planQuantization;
        //     this.unit = checkPlanContent(planContent).unit;
        // }
    }

    Plan.prototype = new AddedItem();
    Plan.prototype.constructor = Plan;

    Plan.prototype.checkPlanContent = function () {
        var content = this.content;

        if (!content.match(/\d+/)) {
            if (this.planQuantization) {
                delete this.planQuantization;
                delete this.unit;
                this.finishCon = 0;
            };
            return false;
        }
        else if (!this.planQuantization) {
            this.finishCon = 0;
        }

        this.planQuantization = content.match(/\d+/)[0];
        var numIndex = content.indexOf(this.planQuantization) + this.planQuantization.length;
        this.unit = content.substring(numIndex, numIndex + 1);
    }


    Plan.prototype.addProgress = function () {
        var id = this.id;

        //finished
        if (this.planQuantization) {
            if (this.finishCon == this.planQuantization) {
                return;
            }

            this.finishCon += 1;
            // this.finishConShow = this.finishCon;
        }
        else {
            this.finishCon = this.finishCon >= 95 ? 100 : Math.round(this.finishCon + 5);
            // this.finishConShow = this.finishCon + '%';
        }

        this.updateFinishConShow();
        this.updateBar();
        allPlans[id] = this;
        localStorageService.set('allPlans', allPlans);
    }

    Plan.prototype.minusProgress = function() {
        var id = this.id;

        //finished
        if (this.planQuantization) {
            if (this.finishCon == 0) {
                return;
            }

            this.finishCon -= 1;
            // this.finishConShow = this.finishCon;
        }
        else {
            this.finishCon = this.finishCon <= 5 ? 0 : Math.round(this.finishCon - 5);
            // this.finishConShow = this.finishCon + '%';
        }

        this.updateFinishConShow();
        this.updateBar();
        allPlans[id] = this;
        localStorageService.set('allPlans', allPlans);
    };

    Plan.prototype.updateFinishConShow = function () {
        //finished
        if (this.planQuantization) {
            this.finishConShow = this.finishCon;
        }
        else {
            this.finishConShow = this.finishCon + '%';
        }
    }

    Plan.prototype.updateBar = function() {
        var id = this.id;
        var timeBarwidth = this.timePassedPerc * 100;
        this.timeBarStyle = {'width': timeBarwidth + '%'};

        var planBarWidth = this.planQuantization ? this.finishCon/this.planQuantization*100 : this.finishCon;
        var planBarColor;

        var finishEffe = planBarWidth / timeBarwidth;
        if (finishEffe < 0.4) {
            planBarColor = gradientColor.redColor.deep_3;
        }
        else if (finishEffe >=0.4 && finishEffe < 0.8) {
            planBarColor = gradientColor.redColor.deep_2;
        }
        else if (finishEffe >=0.8 && finishEffe < 1.2) {
            planBarColor = gradientColor.greenColor.deep_2;
        }
        else if (finishEffe >= 1.2) {
            planBarColor = gradientColor.greenColor.deep_3;
        }

        this.planBarStyle = {'width': planBarWidth + '%',
                             'background-color': planBarColor};

    };

    function calculateTimeSpan (firstDate, secondDate) {
        var oneDay = 24*60*60*1000;
        return Math.round(Math.abs(firstDate.getTime() - secondDate.getTime())/oneDay);
    }

    var gradientColor = {

        redColor: {
            deep_3: '#FF604D',
            deep_2: '#DD764D',
            // deep_1: '#BB8D4E'
        },

        greenColor: {
            deep_3: '#56D251',
            deep_2: '#77BB50',
            deep_1: '#BB8D4E'
        }

    }

    return Plan;
})

taskList.controller('taskListCtrl', function ($scope, localStorageService, AddedItem, Task) {
    
    var currentDate;

    // function Task (id, name, date) {
    //     //if input is object get from localstorage
    //     if (!name && !date && id instanceof Object) {
    //         for (prop in id){
    //             this[prop] = id[prop];
    //             //change taskName to content
    //             this.content = id.taskName
    //         }

    //         return;
    //     }

    //     this.id = id;
    //     this.taskName = name;
    //     this.finishCon = {};

    //     startYear = date.getFullYear();
    //     startMonth = date.getMonth();

    //     this.startYM = '' + startYear + startMonth
    //     this.startDay = date.getDate() - 1;
    //     //init finishCon: {startMonth: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']}
    //     this.finishCon[this.startYM] = new Array(parseInt(this.startDay) + 1 ).join('-').split('');
    // }

    // Task.prototype = new AddedItem();
    // Task.prototype.constructor = Task;

    
    function init (){
        //prevent select page while db click
        clearSelection();

        currentDate = new Date();
        var currentYear = currentDate.getFullYear();
        var currentMonth = currentDate.getMonth();
        var monthDayCount = new Date(currentYear, currentMonth + 1, 0).getDate();

        var monthDays = Array.apply(null, {length: monthDayCount}).map(Number.call, Number);

        $scope.currentMonth = currentMonth;
        $scope.monthDays = monthDays;
        $scope.currentYM = '' + currentYear + currentMonth;
        $scope.currentYear = currentYear;
        $scope.showWelcome = true;

        //init local storage
        if (!localStorageService.get('allTasks')) {
            localStorageService.set('allTasks', []);
            
        }

        allTasksLocal = localStorageService.get('allTasks');
        for (var i=0, len=allTasksLocal.length; i<len; i++) {
            allTasks.push(new Task(allTasksLocal[i]));
        }

        // console.log(typeof allTasks)
        if (allTasks.length) {
            $scope.showWelcome = false;
        };

    }


    function enterTask (event) {

        var addedTask = document.getElementById('input-task');

        var startId = allTasks.length;
        var date = new Date();
        var addedTaskName = addedTask.value;
        addedTask.value = ''


        addedTask = new Task((startId), addedTaskName, date);

        // addedTask.value = ''
        //why if set after will not work;
        allTasks[startId] = addedTask;

        localStorageService.set('allTasks', allTasks);
        if (allTasks.length === 1) {
            $scope.showWelcome = false;
        };

    }

    function updateFinishState (event) {
        var checbox = event.target;

        var targetParentNode = findParent(checbox, 'data-task');

        var state = targetParentNode.getAttribute('ng-switch-when')
        var task = JSON.parse(targetParentNode.getAttribute('data-task'));
        var taskDay = targetParentNode.getAttribute('data-task-day');
        var YM = targetParentNode.getAttribute('data-task-YM');

        var id = task.id;


        if (!allTasks[id].finishCon[YM]) {
            allTasks[id].finishCon[YM] = [];
        };

        switch (state) {

            case '_undefined_':
                allTasks[id].finishCon[YM][taskDay] = true;
                break;

            case 'true':
                allTasks[id].finishCon[YM][taskDay] = '_false';
                break;

            case '_false':
                allTasks[id].finishCon[YM][taskDay] = null;
                break;
            default:
                break;

        }

        updateStorage(allTasks)

    }
    

    function outputData () {
        var downloadLink = document.getElementById('output-data-link');
            downloadLink.style.display = 'inline-block'

        if (navigator.appVersion.toString().indexOf('.NET') > 0) {
            var text = JSON.stringify(localStorageService.get('allTasks'));
            var blob = new Blob([text]);
            // console.log('bl')
            downloadLink.addEventListener('click',function () {
                window.navigator.msSaveBlob(blob, 'data.txt');
            })
        }
        else {
            downloadLink.href = saveData();
        }
        function saveData () {
            var textFile = null;
            var text = JSON.stringify(localStorageService.get('allTasks'));

            var data = new Blob([text], {type: 'text/plain'});
            // If we are replacing a previously generated file we need to
            // manually revoke the object URL to avoid memory leaks.
            if (textFile !== null) {
              window.URL.revokeObjectURL(textFile);
            }

            textFile = window.URL.createObjectURL(data);
            return textFile;
        }
    }


    function uploadData () {
        var file = document.getElementById("input-data").files[0];
        var r = new FileReader;

        r.onloadend = function (e) {

            try {
                var _allTasks = JSON.parse(e.target.result);
            } catch (e) {
                alert('好像你上传的文件不对哦，请上传网站导出的文件，如果还是不行，请联系我');
                return false
            }
            
            angular.copy(_allTasks, allTasks);
            $scope.$apply();
            updateStorage(allTasks)
        }

        r.readAsText(file);

    }

    function showCtrlPanel () {
        var cp = document.getElementById('ctrl-panel');
        var cpState = cp.getAttribute('data-state');
        var btn = document.getElementsByClassName('hamburger-cen')[0];


        if (cpState == 'hide') {
            cp.setAttribute('data-state', 'show');
            cp.style.right = '0px';
            angular.element(btn).addClass('active')
        } else if (cpState == 'show') {
            cp.setAttribute('data-state', 'hide');
            cp.style.right = '-350px'
            angular.element(btn).removeClass('active')
        }
    }


    function nextMonth (currentShowMonth) {
        // var nextMonth = $scope.currentMonth + 1;        
        // var nextDate = new ($)
        currentDate.setMonth(currentDate.getMonth() + 1);
        $scope.currentMonth = currentDate.getMonth();
        $scope.currentYM = currentDate.getFullYear() + '' + $scope.currentMonth;
        $scope.currentYear = currentDate.getFullYear();
    }

    function preMonth (currentMonth) {
        currentDate.setMonth(currentDate.getMonth() - 1);
        $scope.currentMonth = currentDate.getMonth();
        $scope.currentYear = currentDate.getFullYear();
        $scope.currentYM = currentDate.getFullYear() + '' + $scope.currentMonth;
    }

    function findParent (child, dataProp) {
        var parentNode = child;

        while (!parentNode.getAttribute(dataProp)) {
            parentNode = parentNode.parentNode;
        }

        return parentNode
    }

    function updateStorage (allTasks) {
        localStorageService.set('allTasks', allTasks);
        $scope.showWelcome = false;
        //$scope.$apply();
    }

    function clearSelection() {
        if(document.selection && document.selection.empty) {
            document.selection.empty();
        } else if(window.getSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
        }
    }

    function filterEmptyAndPre (item) {
        var startYM = parseInt(item.startYM);
        var currentYM = parseInt($scope.currentYM)
        return !(item.id === undefined || startYM > currentYM)
    }

    $scope.allTasks = allTasks;

    $scope.enterTask = enterTask;
    $scope.updateFinishState = updateFinishState;

    //about io data
    $scope.outputData = outputData;
    $scope.uploadData = uploadData;

    //filter
    $scope.filterEmptyAndPre = filterEmptyAndPre;


    //change month
    $scope.nextMonth = nextMonth;
    $scope.preMonth = preMonth;


    init();
})


// section_2
taskList.controller('longTermPlan', function ($scope, localStorageService, AddedItem, Plan) {

    var currentDate;

    function addNewPlan () {
        var startDate = $( "#start-date" ).val().split('/');
        var endDate = $('#end-date').val().split('/');
        var planContent = $('#plan-content').val();

        if (!checkPlanInput(startDate, endDate, planContent)) {
            return;
        }

        var newPlan = new Plan(startDate, endDate, planContent);
        newPlan.checkPlanContent();
        allPlans.push(newPlan);
        newPlan.id = allPlans.length -1;
        newPlan.updateBar();
        localStorageService.set('allPlans', allPlans);
    }
    /*
     * auxiliary function
     *
     */

    function calculateTimeSpan (firstDate, secondDate) {
        var oneDay = 24*60*60*1000;
        return Math.round(Math.abs(firstDate.getTime() - secondDate.getTime())/oneDay);
    }

    function checkPlanInput (startDate, endDate, planContent) {
        if (!(startDate && endDate && planContent)) {
            alert('输入不全');
            return false;
        };

        var startDateYear = startDate[2];
        var startDateMon = startDate[0];
        var startDateDay = startDate[1];

        var endDateYear = endDate[2];
        var endDateMon = endDate[0];
        var endDateDay = endDate[1];

        if (!(endDateYear >= startDateYear && endDateMon >= startDateMon && endDateDay >= startDateDay)){
            alert('日期不对')
            return false;
        }

        return true;
    }


    function filterEmpty (item) {
        return !(item.id === undefined)
    }

    /*
     * model
     *
     */
    var longTermPlanModel = {

        init: function() {

            $( "#start-date" ).datepicker();
            $('#end-date').datepicker();

            if (!localStorageService.get('allPlans')) {
                localStorageService.set('allPlans', []);
                
            }

            allPlansLocal = localStorageService.get('allPlans');

            for (var i=0, len=allPlansLocal.length; i<len; i++) {
                allPlans.push(new Plan(allPlansLocal[i]));
            }

            currentDate = new Date();
            var currentYear = currentDate.getFullYear();
            var currentMonth = currentDate.getMonth();
            // var monthDayCount = new Date(currentYear, currentMonth + 1, 0).getDate();

            // var monthDays = Array.apply(null, {length: monthDayCount}).map(Number.call, Number);
            $scope.currentDay = currentDate.getDate();
            $scope.currentMonth = currentMonth;
            // $scope.monthDays = monthDays;
            $scope.currentYear = currentYear;

            var firstDate;
            for (var i=0, len=allPlans.length; i<len; i++){
                //plan start date
                firstDate = new Date(allPlans[i]._startDate);
                allPlans[i].timeThrough = calculateTimeSpan(firstDate, currentDate);

                //if planed end time have passed
                allPlans[i].timePassedPerc = allPlans[i].timeThrough / allPlans[i].timeSpan > 1 ? 1 : allPlans[i].timeThrough / allPlans[i].timeSpan;
                allPlans[i].updateBar();
            }
        },

        // gradientColor: {

        //     redColor: {
        //         deep_3: '#FF604D',
        //         deep_2: '#DD764D',
        //         // deep_1: '#BB8D4E'
        //     },

        //     greenColor: {
        //         deep_3: '#56D251',
        //         deep_2: '#77BB50',
        //         deep_1: '#BB8D4E'
        //     }

        // }
    }

    longTermPlanModel.init();

    $scope.allPlans = allPlans;
    $scope.addNewPlan = addNewPlan;
    $scope.filterEmpty = filterEmpty;
})

taskList.controller('ctrlPanel', function ($scope, localStorageService, AddedItem, Task, Plan) {
    $scope.showWelcome = true;
    function showCtrlPanel () {
        var cp = document.getElementById('ctrl-panel');
        var cpState = cp.getAttribute('data-state');
        var btn = document.getElementsByClassName('hamburger-cen')[0];


        if (cpState == 'hide') {
            cp.setAttribute('data-state', 'show');
            cp.style.right = '0px';
            angular.element(btn).addClass('active')
        } else if (cpState == 'show') {
            cp.setAttribute('data-state', 'hide');
            cp.style.right = '-350px'
            angular.element(btn).removeClass('active')
        }
    }
// function addTask () {
//     return
// }
    function addTask (event) {

        var addedTask = document.getElementById('input-task');
        var startId = allTasks.length;
        var date = new Date();
        var addedTaskName = addedTask.value;

        if (!addedTaskName) {
            alert('任务名不能为空哦');
            return;
        }

        addedTask.value = ''

        addedTask = new Task((startId), addedTaskName, date);

        // addedTask.value = ''
        //why if set after will not work;
        allTasks[startId] = addedTask;

        localStorageService.set('allTasks', allTasks);
        if (allTasks.length === 1) {
            $scope.showWelcome = false;
        };

    }

    $scope.showCtrlPanel = showCtrlPanel;
    $scope.addTask = addTask;
})