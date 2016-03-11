/**
 * jquery.clockIntervalPicker.js - A jQuery plugin for interactive time-interval selection based on a clock metaphor.
 *
 * @version v1.0.0
 * @link    GitHub           - https://github.com/JoHae/jQueryClockIntervalPicker
 * @license MIT License      - https://opensource.org/licenses/MIT
 * @author  Johannes Häußler - <johannes.haeussler.87@gmail.com>
 *
 */
$(function () {
    // Static variables shared across all instances
    var TOOLTIP_MARGIN = 15;
    var AM_LABEL = 'AM';
    var PM_LABEL = 'PM';
    var AM_PM_LABEL = 'AM/PM';

    var HOURS_PER_DAY = 24;
    var MINUTES_PER_HOUR = 60;
    var MINUTES_PER_DAY = MINUTES_PER_HOUR*24;
    var DEGREES_CIRCLE = 360;
    var DEGREES_PER_24_HOUR = DEGREES_CIRCLE / HOURS_PER_DAY;
    var DEGREES_PER_12_HOUR = DEGREES_PER_24_HOUR * 2;
    var DEGREES_PER_24_MINUTE = DEGREES_PER_24_HOUR / MINUTES_PER_HOUR;
    var DEGREES_PER_12_MINUTE = DEGREES_PER_12_HOUR / MINUTES_PER_HOUR;

    $.widget('jh.clockTimeIntervalPicker', {
        options: {
            width: 500,
            height: 500,
            multiSelection: true,
            showFaceCircle: false,
            enableAmPmButtons: true,
            showToggleLayoutButton: true,
            useTwelveHoursLayout: true,
            showHourLabels : true,
            selectionTicksMinutes : 10,
            showIndicatorLine : true,
            indicatorLineOptions: {
                stroke: 'black',
                strokeWidth: 2
            },
            faceTicksLargeLength: 8,
            faceTicksLargeOptions: {
                strokeWidth: 4
            },
            faceTicksTinyLength: 5,
            faceTicksTinyOptions: {
                strokeWidth: 2
            },
            faceCircleOptions: {
                fill: 'black',
                fillOpacity: 0.0,
                stroke: 'black',
                strokeOpacity: 0.0,
                strokeWidth: 2
            },
            faceOverlayOptions: {
                fill: 'blue',
                fillOpacity: 0.4,
                stroke: 'blue',
                strokeOpacity: 0.4,
                strokeWidth: 1
            }
        },

        _create: function () {
            // Private vars
            var _this = this;
            var lastY = 0;
            var lastX = 0;
            var mouseDown = false;

            // Interaction
            this.actualStartTime = null;
            this.selectedIntervals = [];
            this.intervalCount = 0;
            this.ctrlHold = false;
            this.amEnabled = true;
            this.pmEnabled = true;

            // Layout
            this.twelveHoursLayout = this.options.useTwelveHoursLayout;

            // Create Basic UI
            this.buttonContainerHeight = 0;
            this._createBasicUIElement();

            // Drawing (SVG)
            var availableSVGWidth = this.options.width;
            var availableSVGHeight = this.options.height - this.buttonContainerHeight;

            this.svgWidthHeight = Math.min(availableSVGWidth, availableSVGHeight);
            this.circleRadius = this.svgWidthHeight / 2;
            if (this.options.showFaceCircle) {
                this.circleRadius -= (2 * this.options.faceCircleOptions.strokeWidth);
            }
            if(this.options.showHourLabels) {
                this.hourLabelFontSize = parseInt(this._getCssClassValue('hour-label', 'font-size'));
                this.circleRadius -= 2 * this.hourLabelFontSize;
            }

            this.actualArcStartPoint = {};
            this.arcPath = null;
            this.interactionGroups = [];
            this.svg = null;
            this.middle = this.svgWidthHeight / 2;
            this.indicatorLineGroup = null;

            this.element.css('width', this.options.width);
            this.element.css('height', this.options.height);
            this.element.css('position', 'relative');
            this.interactionGroupOptions = this.options.faceOverlayOptions;
            this.interactionGroupOptions.transform = 'translate(' + this.middle + ',' + this.middle + ')';

            // Init ticks for minutes w.r.t to statrt angle of given minute
            // NOTE: We will start at 00:00 / 12:00
            this.ticksMinutes = [];
            var numTicks = MINUTES_PER_DAY / this.options.selectionTicksMinutes;
            for(var i = 0; i <= numTicks; i++) {
                this.ticksMinutes.push(i * this.options.selectionTicksMinutes);
            }

            // Init SVG elements
            this.element.svgContainer = $('<div></div>').addClass('jh-svg-container').width(this.svgWidthHeight).height(this.svgWidthHeight).attr('oncontextmenu', "return false;").appendTo(this.element);
            this._createSVGElements();

            /**
             * Mouse Events
             */
            this.element.svgContainer.mousedown(function (event) {
                _this._clearTextSelection();

                // Right Click to reset / select all if no interval exists
                if (event.which === 3) {
                    if(_this.intervalCount > 0) {
                        _this._clearSelection();
                        _this.element.trigger("selectionChanged", {
                            intervals: {}
                        });
                    } else {
                        if(_this.amEnabled) {
                            _this.selectedIntervals.push({
                                startTime : {
                                    hours : 0,
                                    minutes : 0
                                },
                                endTime : {
                                    hours : 11,
                                    minutes : 59
                                }
                            });
                        }
                        if(_this.pmEnabled) {
                            _this.selectedIntervals.push({
                                startTime : {
                                    hours : 12,
                                    minutes : 0
                                },
                                endTime : {
                                    hours : 23,
                                    minutes : 59
                                }
                            });
                        }

                        // Draw a Circle
                        _this.interactionGroups.push(_this.svg.group(_this.interactionGroupOptions));
                        _this.svg.circle(_this.interactionGroups[_this.intervalCount], 0, 0, _this.circleRadius);
                        _this.intervalCount++;
                        _this.element.trigger("selectionChanged", {
                            intervals: _this.selectedIntervals
                        });
                    }
                    return;
                }

                //if (mouseDown) {
                    // Mouse was not released inside clock
                //}

                // Check ctrl hold for append mode
                _this.ctrlHold = event.ctrlKey && _this.options.multiSelection;
                if (!_this.ctrlHold) {
                    _this._clearSelection();
                }

                var time = _this._getTimeFromAbsolutePosition(event.pageX, event.pageY);
                _this.actualStartTime = _this._getTickTime(time.hours, time.minutes);
                var tickAngle = _this._degreesToRadian(_this._getAngleFromTime(_this.actualStartTime.hours, _this.actualStartTime.minutes));
                _this.actualArcStartPoint = _this._polarToCartesian(_this.circleRadius, tickAngle);
                _this._drawSvgArc(null);

                mouseDown = true;
                _this.element.trigger("selectionStarted", {
                    intervals : _this._getIntervalsFromTimeObj(_this.actualStartTime, null, _this.amEnabled, _this.pmEnabled)
                });
            });

            this.element.svgContainer.mouseup(function (event) {
                if (event.which === 3) {
                    return;
                }

                _this._clearTextSelection();

                //if (!mouseDown) {
                    // Mouse was not pressed down inside clock
                //}

                // End arc
                var time = _this._getTimeFromAbsolutePosition(event.pageX, event.pageY);
                var actualEndTime = _this._getTickTime(time.hours, time.minutes);

                _this.intervalCount++;
                mouseDown = false;

                var intervals = _this._getIntervalsFromTimeObj(_this.actualStartTime, actualEndTime, _this.amEnabled, _this.pmEnabled);
                _this.selectedIntervals = _this.selectedIntervals.concat(intervals);
                _this.actualStartTime = null;

                _this.element.trigger("selectionEnded", {
                    intervals : intervals
                });
                _this.element.trigger("selectionChanged", {intervals: _this.selectedIntervals});
            });

            this.element.svgContainer.mouseleave(function () {
                _this._clearIndicatorLine();
                _this.element.tooltipContainer.hide();
            });

            this.element.svgContainer.mouseenter(function () {
                _this.element.tooltipContainer.show();
            });

            this.element.svgContainer.mousemove(function (event) {
                if (event.pageX === lastX && event.pageY === lastY) {
                    return;
                }
                lastX = event.pageX;
                lastY = event.pageY;

                _this._clearTextSelection();

                var time = _this._getTimeFromAngle(_this._getAngleFromAbsolutePosition(lastX, lastY));

                // Find the correct angle according to the ticks
                var tickTime = _this._getTickTime(time.hours, time.minutes);
                var tickAngle = _this._degreesToRadian(_this._getAngleFromTime(tickTime.hours, tickTime.minutes));
                var off = _this.element.offset();
                _this.element.tooltipContainer.css('left', lastX - off.left + TOOLTIP_MARGIN).css('top', lastY - off.top).text(_this._getTooltipText(tickTime));

                if (mouseDown) {
                    // Continue arc
                    // In order to have 0 - 360 degree - Polar to Cartesian
                    var arcEndPoint = _this._polarToCartesian(_this.circleRadius, tickAngle);

                    // Draw the Arc
                    _this._drawSvgArc(arcEndPoint);
                }

                _this._drawIndicatorLine(tickAngle);
            });
        },

        _getTickTime: function(hours, minutes) {
            // Correct time it should be according to ticks
            var totalMinutes = hours * MINUTES_PER_HOUR + minutes;

            // Find nearest element in array regarding total minute
            var tickTotalMinutes;
            for(var i = 0; i < this.ticksMinutes.length - 1; i++) {
                var t = this.ticksMinutes[i];
                var tNext = this.ticksMinutes[i+1];
                if(totalMinutes >= t && totalMinutes <= tNext) {
                    // We have the correct position, determine correct tick
                    var diff = totalMinutes - t;
                    var diffNext = tNext - totalMinutes;
                    if(diff < diffNext) {
                        tickTotalMinutes = t;
                    } else {
                        tickTotalMinutes = tNext;
                    }
                    break;
                }
            }

            var tickHours = parseInt(tickTotalMinutes / MINUTES_PER_HOUR);
            if(tickHours === 24) {
                tickHours = 0;
            }

            return {
                hours: tickHours,
                minutes: tickTotalMinutes % MINUTES_PER_HOUR
            };
        },

        _polarToCartesian : function(dist, angle) {
            // See http://math.stackexchange.com/questions/700237/coordinates-of-sector-of-circle
            return {
                x : dist * Math.sin(angle),
                y : dist * Math.cos(angle) * -1,
                angle : angle
            };
        },

        _drawIndicatorLine : function(angle) {
            // Draw Indicator Line
            this._clearIndicatorLine();

            this.indicatorLineGroup = this.svg.group({transform: 'translate(' + this.middle + ',' + this.middle + ')'});
            this.options.indicatorLineOptions.transform = 'rotate(' + this._radianToDegrees(angle) + ')';
            this.svg.line(this.indicatorLineGroup, 0, 0, 0, -this.circleRadius, this.options.indicatorLineOptions);
        },

        _clearIndicatorLine : function() {
            // Clear Indicator Line
            if(this.indicatorLineGroup !== null) {
                this.svg.remove(this.indicatorLineGroup);
                this.indicatorLineGroup = null;
            }
        },

        _getCssClassValue : function(className, attributeName) {
            var $p = $("<p></p>").addClass(className).hide().appendTo(this.element);
            var value = $p.css(attributeName);
            $p.remove();
            return value;
        },

        _clearTextSelection : function () {
            // Clear Text Selection since sometimes it selects labels (e.g. the timelabel)
            if (window.getSelection) {
                if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                }
            } else if (document.selection) {  // IE?
                document.selection.empty();
            }
        },

        _getTimeFromAbsolutePosition: function (x, y) {
            var angle = this._getAngleFromAbsolutePosition(x, y);
            return this._getTimeFromAngle(angle);
        },

        _getAngleFromAbsolutePosition: function (x, y) {
            // Transform position vector
            var offset = this.element.svgContainer.offset();
            var xRel = x - offset.left - this.middle;
            var yRel = y - offset.top - this.middle;

            // atan2 is the angle to the positive x-axis + 45° s.t. 12 o'clock is 0°/360°
            var angle = Math.atan2(yRel, xRel) + Math.PI / 2;
            if (angle < 0) {
                angle += 2 * Math.PI;
            }

            return angle;
        },

        _radianToDegrees: function(angle) {
            return angle * (180 / Math.PI);
        },

        _degreesToRadian: function(angle) {
            return angle * (Math.PI / 180);
        },

        _getTooltipText: function (timeObj) {
            var tooltipText = "";
            var amPmLabel = "";

            if(this.twelveHoursLayout) {
                if (this.amEnabled && this.pmEnabled) {
                    amPmLabel = AM_PM_LABEL;
                } else if (this.amEnabled) {
                    amPmLabel = AM_LABEL;
                } else if (this.pmEnabled) {
                    amPmLabel = PM_LABEL;
                }
            }

            if (this.actualStartTime !== null) {
                tooltipText += this._timeObjectToString(this.actualStartTime);
                if (!this.amEnabled || !this.pmEnabled) {
                    tooltipText += ' ' + amPmLabel;
                }
                tooltipText += ' - ';

                // Switch AM/PM if startTime is before 12 and timeObj after 12
                var hourDiff = this.actualStartTime.hours - timeObj.hours;
                if (this.actualStartTime.hours < 12 && (timeObj.hours >= 12 || hourDiff > 0 || hourDiff === 0 && this.actualStartTime.minutes > timeObj.minutes)) {
                    if (amPmLabel === AM_LABEL) {
                        amPmLabel = PM_LABEL;
                    } else if (amPmLabel === PM_LABEL) {
                        amPmLabel = AM_LABEL;
                    }
                }
            }
            tooltipText += this._timeObjectToString(timeObj) + " " + amPmLabel;
            return tooltipText;
        },

        _getTimeFromAngle: function (angle) {
            var decimalValue;
            if(this.twelveHoursLayout) {
                decimalValue = 6.0 - ( 1.0 / 30.0 ) * ( (this._radianToDegrees(angle) + DEGREES_CIRCLE/2) % DEGREES_CIRCLE ) * -1;
            } else {
                decimalValue = 12.0 - ( 1.0 / 15.0 ) * ( (this._radianToDegrees(angle)) % DEGREES_CIRCLE ) * -1;
            }

            // Normalize from 12 - 11
            if (decimalValue < 0) {
                decimalValue += 12.0;
            }
            if (decimalValue > 12) {
                decimalValue -= 12.0;
            }

            var hours = parseInt(decimalValue);
            if (hours === 12 && (this.twelveHoursLayout || angle === 0)) {
                hours = 0;
            }

            var minutes = parseInt(decimalValue * MINUTES_PER_HOUR) % MINUTES_PER_HOUR;

            return {hours: hours, minutes: minutes};
        },

        _getAngleFromTime: function(hours, minutes) {
            var angle;
            if(this.twelveHoursLayout) {
                angle = hours * DEGREES_PER_12_HOUR + minutes * DEGREES_PER_12_MINUTE;
            } else {
                angle = hours * DEGREES_PER_24_HOUR + minutes * DEGREES_PER_24_MINUTE;
            }
            return angle;
        },

        _getIntervalsFromTimeObj : function(startTime, endTime, amEnabled, pmEnabled) {
            var intervals = [];

            // Copy objects
            var firstStart = $.extend({},startTime);
            if(startTime.hours === 12) {
                firstStart.hours = 0;
            }

            var firstEnd = $.extend({},endTime);
            if(endTime !== null && endTime.hours === 12) {
                firstEnd.hours = 0;
            }

            if(amEnabled) {
                if(endTime !== null) {
                    // Check whether endTime should be PM
                    if(firstEnd.hours < firstStart.hours || firstEnd.hours === firstStart.hours && firstEnd.minutes < firstStart.minutes) {
                        firstEnd.hours += 12;
                    }

                    intervals.push({startTime : firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime : firstStart});
                }
            }

            if(pmEnabled) {
                // Copy objects
                firstStart = $.extend({},startTime);
                if(startTime.hours === 12) {
                    firstStart.hours = 0;
                }

                firstEnd = $.extend({},endTime);
                if(endTime !== null && endTime.hours === 12) {
                    firstEnd.hours = 0;
                }

                if(endTime !== null) {
                      // Check whether endTime should be AM
                    if(firstEnd.hours < firstStart.hours || firstEnd.hours === firstStart.hours && firstEnd.minutes < firstStart.minutes) {
                        firstEnd.hours -= 12;
                    }

                    firstEnd.hours += 12;
                    firstStart.hours += 12;

                    intervals.push({startTime : firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime : firstStart});
                }
            }
            return intervals;
        },

        _drawSvgArc: function (arcEndPoint) {
            // See http://stackoverflow.com/questions/21205652/how-to-draw-a-circle-sector-in-css/21206274#21206274
            // See http://svg.tutorial.aptico.de/start3.php?knr=10&kname=Pfade&uknr=10.8&ukname=A%20und%20a%20-%20Bogenkurven
            if (!this.ctrlHold) {
                // Clear all arcs
                this._clearArcGroups();
            } else {
                // Clear only last arc if there is one
                if (this.interactionGroups.length >= this.intervalCount) {
                    for (var i = this.intervalCount; i < this.interactionGroups.length; i++) {
                        this.svg.remove(this.interactionGroups[i]);
                        this.interactionGroups.pop();
                    }
                }
            }
            if (this.interactionGroups.length !== this.intervalCount) {
                console.error("length: " + this.interactionGroups.length);
                console.error("Count:  " + this.intervalCount);
            }

            this.interactionGroups.push(this.svg.group(this.interactionGroupOptions));

            this.arcPath = this.svg.createPath();
            if (arcEndPoint === null) {
                // Just draw a line
                this.arcPath.move(0, 0).line([[0, 0], [this.actualArcStartPoint.x, this.actualArcStartPoint.y]]).close();
            } else {
                // Draw additional arc
                var aDiff = arcEndPoint.angle - this.actualArcStartPoint.angle;
                var clockwise = false;
                if(aDiff > Math.PI) {
                    clockwise = true;
                }
                if(aDiff < 0 && aDiff > Math.PI * -1) {
                    clockwise = !clockwise;
                }

                this.arcPath.move(0, 0)
                    .line([[0, 0], [this.actualArcStartPoint.x, this.actualArcStartPoint.y]])
                    .arc(this.circleRadius, this.circleRadius, 1, clockwise, 1, arcEndPoint.x, arcEndPoint.y)
                    .line([[arcEndPoint.x, arcEndPoint.y], [0, 0]])
                    .close();
            }
            this.svg.path(this.interactionGroups[this.intervalCount], this.arcPath);
        },

        _clearArcGroups: function () {
            if (this.interactionGroups.length > 0) {
                for (var i = 0; i < this.interactionGroups.length; i++) {
                    this.svg.remove(this.interactionGroups[i]);
                }
            }
            this.interactionGroups = [];
        },

        _clearSelection: function () {
            this.actualStartTime = null;
            this.actualArcStartPoint = {};
            this.intervalCount = 0;
            this.selectedIntervals = [];

            this._clearArcGroups();
            this.arcPath = null;
        },

        _timeObjectToString: function (timeObj) {
            var hours = timeObj.hours;
            if(hours === 0 && this.twelveHoursLayout) {
                hours = 12;
            }
            return ( hours < 10 ? "0" + hours : hours ) + ":" + (timeObj.minutes < 10 ? "0" + timeObj.minutes : timeObj.minutes);
        },

        _createBasicUIElement: function () {
            var _this = this;

            // Time tooltip
            this.element.tooltipContainer = $('<div></div>').addClass('jh-tooltip-container').hide().appendTo(this.element);

            if (!this.options.showToggleLayoutButton && !this.options.enableAmPmButtons) {
                return;
            }

            var buttonContainer = $('<div></div>').addClass('jh-button-container').appendTo(this.element);

            // AM/PM Buttons
            var amPmButtonContainer;
            if (this.options.enableAmPmButtons) {
                amPmButtonContainer = $('<div></div>').addClass('jh-am-pm-button-container').appendTo(buttonContainer);
                $(' <input type="radio" id="jh-am-button" name="radio" value="' + AM_LABEL + '"><label for="jh-am-button">' + AM_LABEL + '</label>').appendTo(amPmButtonContainer);
                $(' <input type="radio" id="jh-pm-button" name="radio" value="' + PM_LABEL + '"><label for="jh-pm-button">' + PM_LABEL + '</label>').appendTo(amPmButtonContainer);
                $(' <input type="radio" id="jh-both-button" name="radio"  value="' + AM_PM_LABEL + '" checked="checked"><label for="jh-both-button">' + AM_PM_LABEL + '</label>').appendTo(amPmButtonContainer);

                amPmButtonContainer.buttonset();

                $('input:radio[name=radio]').change(function () {
                    _this.amEnabled = false;
                    _this.pmEnabled = false;
                    if (this.value === AM_LABEL) {
                        _this.amEnabled = true;
                    } else if (this.value === PM_LABEL) {
                        _this.pmEnabled = true;
                    } else if (this.value === AM_PM_LABEL) {
                        _this.amEnabled = true;
                        _this.pmEnabled = true;
                    }
                });
            }

            var layoutButton;
            if (this.options.showToggleLayoutButton) {
                var toggleButtonContainer = $('<div></div>').addClass('jh-toggle-button-container').appendTo(buttonContainer);
                $(' <input type="checkbox" id="clockLayout"><label for="clockLayout">24h</label> ').appendTo(toggleButtonContainer);
                layoutButton = $('#clockLayout').button().on('change', function () {
                    var val = $(this).is(':checked');
                    _this.twelveHoursLayout = !val;
                    if (typeof amPmButtonContainer !== 'undefined') {
                        if (val) {
                            amPmButtonContainer.hide();
                        } else {
                            amPmButtonContainer.show();
                        }
                    }
                    _this._clearSVGElements();
                    _this._createSVGElements();
                });
            }

            // Set initial values of layoutButton
            if (typeof amPmButtonContainer !== 'undefined') {
                if (_this.twelveHoursLayout) {
                    if (typeof layoutButton !== 'undefined') {
                        layoutButton.prop("checked", false);
                    }
                    amPmButtonContainer.show();
                } else {
                    if (typeof layoutButton !== 'undefined') {
                        layoutButton.prop("checked", true);
                    }
                    amPmButtonContainer.hide();
                }
                if (typeof layoutButton !== 'undefined') {
                    layoutButton.button('refresh');
                }
            }

            this.buttonContainerHeight = buttonContainer.outerHeight();
        },

        /**
         *
         * @private
         */
        _createSVGElements: function () {
            var _this = this;
            function drawClock(svg) {
                _this.svg = svg;
                $(svg.root()).attr('width', '100%').attr('height', '100%').attr('cursor', 'crosshair');
                //$(svg.root()).removeAttr('width').removeAttr('height').attr('viewBox', '0 0 400 400');
                var radius = _this.circleRadius;

                if (_this.options.showFaceCircle) {
                    svg.circle(_this.middle, _this.middle, radius, _this.options.faceCircleOptions);
                }

                // Draw the face
                // 12 to 12
                var svgClockFaceGroup = svg.group({stroke: 'black', transform: 'translate(' + _this.middle + ',' + _this.middle + ')'});

                // Small ticks
                var lengthShort = _this.circleRadius - _this.options.faceTicksTinyLength;
                var tOptions = _this.options.faceTicksTinyOptions;
                var degreesPerTick = 6;
                if(!_this.twelveHoursLayout) {
                    degreesPerTick /= 2;
                }
                for (var i = 0; i < DEGREES_CIRCLE; i += degreesPerTick) {
                    tOptions.transform = 'rotate(' + i + ')';
                    svg.line(svgClockFaceGroup, 0, _this.circleRadius, 0, lengthShort, tOptions);
                }

                // Large ticks (12-3-6-9)
                var lengthLong = _this.circleRadius - _this.options.faceTicksLargeLength;
                degreesPerTick = DEGREES_PER_12_HOUR;
                if(!_this.twelveHoursLayout) {
                    degreesPerTick = DEGREES_PER_24_HOUR;
                }
                for (i = 0; i < DEGREES_CIRCLE; i += degreesPerTick) {
                    tOptions = _this.options.faceTicksLargeOptions;
                    tOptions.transform = 'rotate(' + i + ')';
                    svg.line(svgClockFaceGroup, 0, _this.circleRadius, 0, lengthLong, tOptions);
                }

                // Text
                if (_this.options.showHourLabels) {
                    if(_this.twelveHoursLayout) {
                        svg.text(svgClockFaceGroup, 0, -_this.circleRadius - 12, "12");
                        svg.text(svgClockFaceGroup, 0, _this.circleRadius + _this.hourLabelFontSize + 6, "6");
                        svg.text(svgClockFaceGroup, -_this.circleRadius - _this.hourLabelFontSize, _this.hourLabelFontSize/4, "9");
                        svg.text(svgClockFaceGroup, _this.circleRadius + _this.hourLabelFontSize, _this.hourLabelFontSize/4, "3");
                    } else {
                        svg.text(svgClockFaceGroup, 0, -_this.circleRadius - 12, "0");
                        svg.text(svgClockFaceGroup, 0, _this.circleRadius + _this.hourLabelFontSize + 6, "12");
                        svg.text(svgClockFaceGroup, -_this.circleRadius - _this.hourLabelFontSize, _this.hourLabelFontSize/4, "18");
                        svg.text(svgClockFaceGroup, _this.circleRadius + _this.hourLabelFontSize, _this.hourLabelFontSize/4, "6");
                    }

                    $('text', svg.root()).attr('text-anchor', 'middle').addClass('hour-label');
                }
            }

            this.element.svgContainer.svg({
                onLoad: drawClock
            });
        },

        _clearSVGElements: function() {
            this.element.svgContainer.empty();
            this.element.svgContainer.removeClass('hasSVG');
        },

        _destroy: function () {

        },

        _setOption: function () {
            // TODO: Implement
            //if(name === 'maxItems') {
            //    this._resizeBoxForMaxItemsOf(value);
            //}
            $.Widget.prototype._setOption.apply(this, arguments);
        }
    });
});
