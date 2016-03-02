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
    var TEXT_OFFSET = 24;
    var AM_LABEL = 'AM';
    var PM_LABEL = 'PM';
    var AM_PM_LABEL = 'AM/PM';

    $.widget('jh.clockTimeIntervalPicker', {
        options: {
            width: 500,
            height: 500,
            multiSelection: true,
            showFaceCircle: false,
            enableAmPmButtons: true,
            showToggleLayoutButton: false,
            showHourLabels : false,
            selectionTicksMinutes : 1,
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
            // Calculate circle radius according to width / height / label font-size
            this.circleRadius = Math.min(this.options.height, this.options.width) / 2 - 2 * parseInt(this._getCssClassValue('hour-label', 'font-size'));

            console.log('Radius of Circle is:' + this.circleRadius);

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

            // Drawing
            this.actualArcStartPoint = {};
            this.arcPath = null;
            this.interactionGroups = [];
            this.svg = null;
            this.svgWidthHeight = 2 * (this.circleRadius + TEXT_OFFSET);
            if (this.options.showFaceCircle) {
                this.svgWidthHeight += (2 * this.options.faceCircleOptions.strokeWidth);
            }
            this.middle = this.svgWidthHeight / 2;
            this.indicatorLineGroup = null;

            this.element.css('width', this.options.width);
            this.element.css('height', this.options.height);
            this.element.css('position', 'relative');
            this.interactionGroupOptions = this.options.faceOverlayOptions;
            this.interactionGroupOptions.transform = 'translate(' + this.middle + ',' + this.middle + ')';

            /**
             * Init elements
             */
            this._createElements();

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

                // Start an arc path and draw a line
                var angle = _this._getAngleFromAbsolutePosition(event.pageX, event.pageY);
                _this.actualArcStartPoint = _this._polarToCartesian(_this.circleRadius, angle);
                _this._drawSvgArc(null);

                // Set start/end time
                _this.actualStartTime = _this._getTimeFromAbsolutePosition(event.pageX, event.pageY);

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
                var actualEndTime = _this._getTimeFromAbsolutePosition(event.pageX, event.pageY);
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

                var angle = _this._getAngleFromAbsolutePosition(lastX, lastY);
                var time = _this._getTimeFromAngle(angle);

                var off = _this.element.offset();

                _this.element.tooltipContainer.css('left', lastX - off.left + 15).css('top', lastY - off.top).text(_this._getTooltipText(time));

                if (mouseDown) {
                    // Continue arc
                    // In order to have 0 - 360 degree - Polar to Cartesian
                    var arcEndPoint = _this._polarToCartesian(_this.circleRadius, angle);

                    // Draw the Arc
                    _this._drawSvgArc(arcEndPoint);
                }

                _this._drawIndicatorLine(angle);
            });
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

            if (this.amEnabled && this.pmEnabled) {
                amPmLabel = AM_PM_LABEL;
            } else if (this.amEnabled) {
                amPmLabel = AM_LABEL;
            } else if (this.pmEnabled) {
                amPmLabel = PM_LABEL;
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
            var decimalValue = 6.0 - ( 1.0 / 30.0 ) * ( (this._radianToDegrees(angle) + 180) % 360 ) * -1;

            // Normalize from 12 - 11
            if (decimalValue < 0) {
                decimalValue += 12.0;
            }
            if (decimalValue > 12) {
                decimalValue -= 12.0;
            }
            var hours = parseInt(decimalValue);
            if (hours === 0) {
                hours = 12;
            }
            var minutes = parseInt(decimalValue * 60) % 60;

            return {hours: hours, minutes: minutes};
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
            return ( timeObj.hours < 10 ? "0" + timeObj.hours : timeObj.hours ) + ":" + (timeObj.minutes < 10 ? "0" + timeObj.minutes : timeObj.minutes);
        },

        /**
         *
         * @private
         */
        _createElements: function () {
            var _this = this;

            // Time tooltip
            this.element.tooltipContainer = $('<div></div>').addClass('jh-tooltip-container').hide().appendTo(this.element);
            var amPmButtonContainer;

            if (this.options.showToggleLayoutButton || this.options.enableAmPmButtons) {
                var buttonContainer = $('<div></div>').addClass('jh-button-container').appendTo(this.element);

                if (this.options.showToggleLayoutButton) {
                    var toggleButtonContainer = $('<div></div>').addClass('jh-toggle-button-container').appendTo(buttonContainer);
                    $(' <input type="checkbox" id="clockLayout"><label for="clockLayout">24h</label> ').appendTo(toggleButtonContainer);
                    $('#clockLayout').button().on('change', function () {
                        var val = $(this).is(':checked');
                        _this.showTwentyFourClockLayout = val;
                        if (typeof amPmButtonContainer !== 'undefined') {
                            if (val) {
                                amPmButtonContainer.hide();
                            } else {
                                amPmButtonContainer.show();
                            }
                        }
                    });

                }

                // AM/PM Buttons
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
            }

            function drawClock(svg) {
                _this.svg = svg;
                $(svg.root()).attr('width', '100%').attr('height', '100%');
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
                for (var i = 0; i < 360; i += 6) {
                    tOptions.transform = 'rotate(' + i + ')';
                    svg.line(svgClockFaceGroup, 0, _this.circleRadius, 0, lengthShort, tOptions);
                }

                // Large ticks (12-3-6-9)
                var lengthLong = _this.circleRadius - _this.options.faceTicksLargeLength;
                for (i = 0; i < 360; i += 30) {
                    tOptions = _this.options.faceTicksLargeOptions;
                    tOptions.transform = 'rotate(' + i + ')';
                    svg.line(svgClockFaceGroup, 0, _this.circleRadius, 0, lengthLong, tOptions);
                }

                // Text
                if (_this.options.showHourLabels) {
                    svg.text(svgClockFaceGroup, 0, _this.circleRadius + TEXT_OFFSET, "6");
                    svg.text(svgClockFaceGroup, -_this.circleRadius - TEXT_OFFSET, 0, "9");
                    svg.text(svgClockFaceGroup, 0, -_this.circleRadius - TEXT_OFFSET, "12");
                    svg.text(svgClockFaceGroup, _this.circleRadius + TEXT_OFFSET, 0, "3");
                    $('text', svg.root()).attr('text-anchor', 'middle').addClass('hour-label');
                }
            }

            this.element.svgContainer = $('<div></div>').addClass('jh-svg-container').width(this.svgWidthHeight).height(this.svgWidthHeight).attr('oncontextmenu', "return false;").appendTo(this.element);
            this.element.svgContainer.svg({
                onLoad: drawClock
            });
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
