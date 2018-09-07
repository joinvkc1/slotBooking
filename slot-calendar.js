// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {
 
	"use strict";
   
        var HARD_BOOKING = "hardBookings";
        var SOFT_BOOKING = "softBookings";
        var GENERAL = "general";
        var WEEKENDS_BOOKING ="weekends";
        var ALL_CLAASESS = "hardBooking softBooking selected";
      // Create the defaults once
    var pluginName = "slotCalendar",
        defaults = {
            months: ['january','february','march','april','may','june','july','august','september','october','november','december'], //string of months starting from january
            days: ['sunday','monday','tuesday','wenesday','thursday','friday','saturday'], //string of days starting from sunday
            maxSelect:365            
        };

    // The actual plugin constructor
    function Plugin ( element, options ) {        
        this.element = element;
        this.settings = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;
        this.currentDate = new Date();
        if(!!this.settings.minDate){
            this.currentDate.setDate(this.settings.minDate.getDate());
        }
        else{
            this.settings.minDate= new Date();
        }
        if(!this.settings.maxDate){
            this.settings.maxDate= new Date();
            this.settings.maxDate.setDate(this.currentDate.getDate()+365);
        }
        this.init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {
        enabled:false,
        selected:[],
        isRangeActive: false,
        rangeHovered:{},
        hardBookings:{},
        softBookings:{},
        weekEnds:{},
        alreadySelected:[],
        init: function () {
            var container = $(this.element);
            var todayDate = this.currentDate;            
            var calendar = $('<div class="calendar"></div>');
            var header = $('<header>'+
                           '<h2 class="month"></h2>'+
                           '<a class="btn btn-prev " style="display:none" href="#"><</a>'+
                           '<a class="btn btn-next" href="#">></a>'+
				            '</header>');            
            this.updateHeader(todayDate,header);
            calendar.append(header);            
            this.buildCalendar(todayDate,calendar);
            container.append(calendar);            
            this.bindEvents();
            this.fillPreBookings();
           
        },
         getWeeknd : function(dt) {
            var d = new Date(dt),
                month = d.getMonth(),
                wknd = [];
        
            d.setDate(1);
        
            // Get the first saturday in the month
            while (d.getDay() !== 6) {
                d.setDate(d.getDate() + 1);
            }
        
            // Get all the other weekends in the month
            while (d.getMonth() === month) {
                wknd.push(new Date(d.getTime()));
                 let dd = new Date(d.getTime());		
                dd.setDate(dd.getDate()+1);
                wknd.push(new Date(dd.getTime()));
                d.setDate(d.getDate() + 7);
            }
        
            return wknd;
        },
        fillWeekends:function(){
            var that = this;
            var now = new Date(that.currentDate);
           var weekdns = that.getWeeknd(now);
           for(let i = 0;i<weekdns.length;i++){
                let date_WK = new Date(weekdns[i]);
                let dateID = date_WK.toDateString().split(" ").join("-");
                let elem =  $("#"+dateID);
                elem.attr("bookingtype",WEEKENDS_BOOKING);
                elem.attr("editable",false);
                that.weekEnds[date_WK.toDateString()] = elem;
           }
          that.selectWeekends();
         // that.disableWeekdays(weekdns);
        },
      
        fillPreBookings : function(){
           
            var self = this;
           // self.fillWeekends();
            var ranges ={};
            self.selected =[];
            var tst  =  self.settings.preBookingDetails;
            var len = (tst.hbd.length > tst.sb.length ? (tst.hbd.length > tst.hbr.length ? tst.hbd.length: tst.hbr.length):(tst.sb.length > tst.hbr.length ? tst.sb.length: tst.hbr.length));
            for(let idx=0; idx < len; idx++){
                if(tst.hbd[idx] != undefined){
                    let dt = tst.hbd[idx].dt
                    let date_HB = new Date(dt);
                    let dateID = date_HB.toDateString().split(" ").join("-");
                    let elem =  $("#"+dateID);
                    elem.attr("bookingtype",HARD_BOOKING);
                    elem.attr("editable",false);
                    self.hardBookings[date_HB.toDateString()] = elem;
                }
                if(tst.sb[idx] != undefined){
                    let dt = tst.sb[idx].dt;
                    let date_SB = new Date(dt);
                    let dateID = date_SB.toDateString().split(" ").join("-");
                    let elem =  $("#"+dateID);
                    elem.attr("bookingtype",SOFT_BOOKING);
                    elem.attr("editable",true);
                    self.softBookings[date_SB.toDateString()] = elem;
                }
                // if(tst.hbr[idx] != undefined){
                //     let dt = tst.hbr[idx].dt;
                //     let date_HBR = new Date(dt);
                //     let  dateID = date_HBR.toDateString().split(" ").join("-");
                //     let elem  =  $("#"+dateID);
                //     elem.attr("bookingtype",GENERAL);
                //     elem.attr("editable",true);
                //     ranges[date_HBR.toDateString()] = elem;
                // }

            }
            self.selectAllHardBookings();
            self.selectAllSoftBooking();
            self.rangeHovered = ranges;
            self.selectAll();

        },
        updateDatesTable : function(){
            var self = this;
            var datdsObj = self.getDatesDetail();
            $('#_total').html(datdsObj.totalAvailableDates);
            $('#_selected').html(datdsObj.totalSelectedDates);
            $('#_quantity').html(datdsObj.quantity); 
            
        },
        getDatesDetail: function() {
            var that = this;
        var now = new Date(that.currentDate);
        var totaldaysOnCurrentMonth =  new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
       // let quantity = that.maxSelect;//self.settings.preBookingDetails.hbd.length+self.settings.preBookingDetails.sb.length;
        let totalAvailableDates =  totaldaysOnCurrentMonth - (that.selected.length+that.settings.preBookingDetails.hbd.length+that.settings.preBookingDetails.sb.length);
        let totalSelectedDates = that.selected.join(",  ");
        let quantity = that.settings.maxSelect - that.selected.length;
        return {
            totalAvailableDates: totalAvailableDates,
            totalSelectedDates : totalSelectedDates,
            quantity:quantity
           }  
        },
        disableWeekdays : function(wknds){
            var that = this;
            let now = new Date(that.currentDate);
            let mo = now.getMonth();
            now.setDate(1);
            while (now.getMonth() === mo) {
                if(!(wknds.toString().indexOf(new Date(now.getTime()).toString())!=-1)){
                    let date_ = new Date(now.getTime());
                    let dateID = date_.toDateString().split(" ").join("-");
                    let elem =  $("#"+dateID);
                    elem.find(".day").addClass("disabled"); 
                    elem.on('click', function(e) {
                        e.preventDefault();
                    });

                }                
                now.setDate(now.getDate() + 1);
            }
           
        },
        //Update the current month header
        updateHeader: function (date, header) {
            header.find('.month').html(this.settings.months[date.getMonth()]);
        },
        selectAll: function(){
            var that = this;
            $.each(that.rangeHovered,function(i,x){
                $(x).find('a').removeClass("hardBooking").removeClass("softBooking").addClass('selected');
                that.selected.push(i);
            })
            that.rangeHovered= {};
            this.isRangeActive= false;
            $('.range-hover').removeClass('range-hover');
            that.updateDatesTable();
        },
        selectAllHardBookings:function(){
            var that = this;
            $.each(that.hardBookings,function(i,x){
                $(x).find('a').addClass('hardBooking');
                //that.selected.push(i);
            })
            that.rangeHovered= {};
            this.isRangeActive= false;
            $('.range-hover').removeClass('range-hover');
        },
        selectAllSoftBooking : function(){
            var that = this;
            $.each(that.softBookings,function(i,x){
                $(x).find('a').addClass('softBooking');
                //that.selected.push(i);
            })
            that.rangeHovered= {};
            this.isRangeActive= false;
            $('.range-hover').removeClass('range-hover');
        },
        selectWeekends : function(){
            //weekEnds
            var that = this;
            $.each(that.weekEnds,function(i,x){
                $(x).find('a').removeClass(ALL_CLAASESS).addClass('selected');
                //that.selected.push(i);
            })
            that.rangeHovered= {};
            this.isRangeActive= false;
            $('.range-hover').removeClass('range-hover');

        },
        refreshHoveredRange(start){
            var that = this;
            //will clear rangeHovered except first
            that.rangeHovered = {};
            let id = start.toDateString().split(" ").join("-");
            let ele =  $("#"+id);
            that.rangeHovered[start.toDateString()] = ele;

        },
        fillHoveredRange(elem,day){
            var that =this;
            var start = new Date( Object.keys(that.rangeHovered)[0]);
            var end = new Date(day);
            if(Object.keys(that.rangeHovered)[0]!=undefined){
                that.refreshHoveredRange(start);
                if(start <= end){
                    while(start <= end){
                        if(this.settings.maxSelect>(this.selected.length+Object.keys(that.rangeHovered).length)){
                            if(!that.rangeHovered[start.toDateString()]){
                                let id = start.toDateString().split(" ").join("-");
                                let ele =  $("#"+id);
                                that.rangeHovered[start.toDateString()] = ele;
                                
                             }
                             start = new Date(start.setDate(start.getDate() + 1)); 
                        }
                        else
                        {
                            break;
                        }
                        
                    }
                }
                else
                {
                    while(start >= end){
                        if(this.settings.maxSelect>(this.selected.length+Object.keys(that.rangeHovered).length)){
                            if(!that.rangeHovered[start.toDateString()]){
                                let id = start.toDateString().split(" ").join("-");
                                let ele =  $("#"+id);
                                that.rangeHovered[start.toDateString()] = ele
                                //that.rangeHovered[start.toDateString()] = ele;
                            }
                            start = new Date(start.setDate(start.getDate() - 1)); 
                        }
                        else
                        {
                            break;
                        }
                        
                    }
    
                }
            }
            else
            {
                if(this.settings.maxSelect>(this.selected.length+Object.keys(that.rangeHovered).length)){
                    let id = end.toDateString().split(" ").join("-");
                    let ele =  $("#"+id);
                    that.rangeHovered[end.toDateString()] = ele;
                }
            }
            
        },
        displayInfo: function(elem){
            console.log("no info yet")
        },
        handleRange: function(elem,x,y,day){
           
            $('#tday').html(day);
            if(this.selected.indexOf(day)<0){
                if(this.settings.maxSelect>(this.selected.length+Object.keys(this.rangeHovered).length)){
                    this.rangeHovered[day]=elem;
                    $(elem).find('a').addClass('range-hover');
                }
                if(this.isRangeActive){
                    // if(Object.keys(this.rangeHovered).length >1){
                    //     delete this.rangeHovered[day];
                    //     this.fillHoveredRange(elem,day)
                    // }
                    this.fillHoveredRange(elem,day)
                    this.selectAll();
                }
                else{
                    this.isRangeActive= true;                    
                }
                
            }
            else{
                this.selected.splice(this.selected.indexOf(day), 1)
                $(elem).find('a').removeClass('selected');
                this.updateDatesTable();
            }
        },
        handleHover: function(elem,x,y,day){
            if(this.isRangeActive && (this.settings.maxSelect>(this.selected.length+Object.keys(this.rangeHovered).length))){
                //this.rangeHovered[day]=elem;
                $.each(this.rangeHovered,function(i,x){
                    $(x).find('a').removeClass('range-hover');
                })//refresh class
                this.fillHoveredRange(elem,day);
                    $.each(this.rangeHovered,function(i,x){
                        $(x).find('a').addClass('range-hover');
                    })
                
            }
            else{
                this.displayInfo(elem);
            }
        },
        toggleSelection: function(elem,x,y,day){
            if(this.selected.indexOf(day)<0){
                this.selected.push(day);
                $(elem).find('a').addClass('selected')
            }
            else{
                this.selected = this.selected.splice(this.selected.indexOf(day), 1)
                $(elem).find('a').removeClass('selected')
            }
        },
        disableNav : function(date,header){
            var self = this;
            header.find('.btn').show();
            if(date.getFullYear()== this.settings.minDate.getFullYear()){
                if(date.getMonth()==this.settings.minDate.getMonth()){
                    header.find('.btn-prev').hide();
                }                
            }
            else if(date.getFullYear()==this.settings.maxDate.getFullYear()){
                if(date.getMonth()==this.settings.maxDate.getMonth()){
                    header.find('.btn-next').hide(); 
                    this.enabled= true;
                }
            }
           
            self.fillPreBookings();
        },

        handleClick: function(day,td){
            var that = this;
            var day1= day.toDateString();
            td.on('click',function(e){
                e.preventDefault();
                e.stopPropagation();
                that.handleRange($(e.currentTarget),e.pageX,e.pageY,day1);
            })
            
        },
        handleHoverBind: function(day,td){
            var that = this;
            var day1= day.toDateString();
            td.on('mouseover',function(e){
                that.handleHover($(e.currentTarget),e.pageX,e.pageY,day1);
            })
        },
        
        //Build calendar of a month from date
        buildCalendar: function (fromDate, calendar) {
            var plugin = this;
            if(fromDate.toDateString()===plugin.settings.minDate.toDateString()){
                plugin.enabled= false;
            }            
            calendar.find('table').remove();            
            var body = $('<table></table>');
            var thead = $('<thead></thead>');
            var tbody = $('<tbody></tbody>');            
            //Header day in a week ( (1 to 8) % 7 to start the week by monday)
            for(var i=1; i<=this.settings.days.length; i++) {
                thead.append($('<td>'+this.settings.days[i%7].substring(0,3)+'</td>'));
            }            
            //setting current year and month
            var y = fromDate.getFullYear(), m = fromDate.getMonth();            
            //first day of the month
            var firstDay = new Date(y, m, 1);
            //If not monday set to previous monday
            while(firstDay.getDay() != 1){
                firstDay.setDate(firstDay.getDate()-1);
            }
            //last day of the month
            var lastDay = new Date(y, m + 1, 0);
            //If not sunday set to next sunday
            while(lastDay.getDay() != 0){
                lastDay.setDate(lastDay.getDate()+1);
            }            
            //For firstDay to lastDay
            for(var day = firstDay; day <= lastDay; day.setDate(day.getDate())) {
                var tr = $('<tr></tr>');
                //For each row
                for(var i = 0; i<7; i++) {
                    var td = $('<td id="'+day.toDateString().split(" ").join("-")+'"><a href="#" class="day">'+day.getDate()+'</a></td>');
                    //if today is this day
                    if(day.toDateString() === plugin.settings.minDate.toDateString()){                        
                        plugin.enabled= true;
                    }
                    else if(day.toDateString() === plugin.settings.maxDate.toDateString()){
                        plugin.enabled= false;
                    }
                    if(plugin.selected.indexOf(day.toDateString())>=0){
                        td.find(".day").addClass("selected");
                    }
                    //if day is not in this month
                    if(day.getMonth() != fromDate.getMonth()){
                       td.find(".day").addClass("wrong-month"); 
                       td.on('click', function(e) {
                            e.preventDefault();
                        });
                    }
                    else if(!plugin.enabled){
                        td.find(".day").addClass("disabled"); 
                        td.on('click', function(e) {
                            e.preventDefault();
                        });
                    }
                    else{                       
                        plugin.handleClick(day,td)
                        plugin.handleHoverBind(day,td)                        
                    }                   
                    tr.append(td);
                    day.setDate(day.getDate() + 1);
                }
                tbody.append(tr);
            }            
            body.append(thead);
            body.append(tbody);            
            var eventContainer = $('<div class="event-container"></div>');            
            calendar.append(body);
            calendar.append(eventContainer);
        },
        //Init global events listeners
        bindEvents: function () {
            var plugin = this;            
            //Click previous month
            $('.btn-prev').click(function(){
                plugin.currentDate.setMonth(plugin.currentDate.getMonth()-1);                
                plugin.buildCalendar(plugin.currentDate, $('.calendar'));
                plugin.updateHeader(plugin.currentDate, $('.calendar header'));
                plugin.disableNav(plugin.currentDate,$('.calendar header'))
                $('#tday').html('');
            });
            
            //Click next month
            $('.btn-next').click(function(){
                plugin.currentDate.setMonth(plugin.currentDate.getMonth()+1);
                
                plugin.buildCalendar(plugin.currentDate, $('.calendar'));
                plugin.updateHeader(plugin.currentDate, $('.calendar header'));
                plugin.disableNav(plugin.currentDate,$('.calendar header'))
                $('#tday').html('');
                
            });

            $('body').click(function(e){
                plugin.rangeHovered={};
                $('.range-hover').removeClass('range-hover');
                e.stopPropagation();
            })
        }
        
    });

   
    // preventing against multiple instantiations
    $.fn[ pluginName ] = function ( options ) {
        return this.each(function() {
                if ( !$.data( this, "plugin_" + pluginName ) ) {
                        $.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
                }
        });
    };

})( jQuery, window, document );
