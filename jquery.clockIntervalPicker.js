/**
 * @author Johannes Haeussler - Johannes.3.Haeussler(at)uni-konstanz.de
 * @version 1.0
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
            circleRadius: 200,
            multiSelection: true,
            showFaceCircle: false,
            enableAmPmButtons: true,
            showToggleLayoutButton: false,
            showHourLabels : false,
            faceTicksLargeLength: 10,
            faceTicksLargeOptions: {
                strokeWidth: 5
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
            var middle = this.options.circleRadius + TEXT_OFFSET;
            if (this.options.showFaceCircle) {
                middle += this.options.faceCircleOptions.strokeWidth;
            }

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

            this.element.css('width', this.options.width);
            this.element.css('height', this.options.height);
            this.element.css('position', 'relative');
            this.interactionGroupOptions = this.options.faceOverlayOptions;
            this.interactionGroupOptions.transform = 'translate(' + middle + ',' + middle + ')';

            /**
             * Init elements
             */
            this._createElements(middle);

            /**
             * Mouse Events
             */
            this.element.svgContainer.mousedown(function (event) {
                _this._clearTextSelection();

                // Right Click to reset / select all if no interval exists
                if (event.which == 3) {
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
                        _this.svg.circle(_this.interactionGroups[_this.intervalCount], 0, 0, _this.options.circleRadius);
                        _this.intervalCount++;
                        _this.element.trigger("selectionChanged", {
                            intervals: _this.selectedIntervals
                        });
                    }

                    return;
                }

                if (mouseDown) {
                    // Mouse was not released inside clock
                }

                // Check ctrl hold for append mode
                _this.ctrlHold = event.ctrlKey && _this.options.multiSelection;
                if (!_this.ctrlHold) {
                    _this._clearSelection();
                }

                // Start an arc path and draw a line
                _this.actualArcStartPoint = _this._getArcPointFromAbsolutePosition(event.pageX, event.pageY);
                _this._drawSvgArc(null);

                // Set start/end time
                _this.actualStartTime = _this._getTimeFromAbsolutePosition(event.pageX, event.pageY);

                mouseDown = true;
                _this.element.trigger("selectionStarted", {
                    intervals : _this._getIntervalsFromTimeObj(_this.actualStartTime, null, _this.amEnabled, _this.pmEnabled)
                });
            });

            this.element.svgContainer.mouseup(function (event) {
                if (event.which == 3) {
                    return;
                }

                _this._clearTextSelection();

                if (!mouseDown) {
                    // Mouse was not pressed down inside clock
                }

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
                _this.element.tooltipContainer.hide();
            });

            this.element.svgContainer.mouseenter(function () {
                _this.element.tooltipContainer.show();
            });

            this.element.svgContainer.mousemove(function (event) {
                if (event.pageX == lastX && event.pageY == lastY) {
                    return;
                }
                lastX = event.pageX;
                lastY = event.pageY;

                _this._clearTextSelection();

                var pRel = _this._getRelativePosition(lastX, lastY);
                var angle = _this._getAngleFromRelativePosition(pRel.x, pRel.y);
                var time = _this._getTimeFromAngle(angle);

                var off = _this.element.offset();

                _this.element.tooltipContainer.css('left', lastX - off.left + 15).css('top', lastY - off.top).text(_this._getTooltipText(time));

                if (mouseDown) {
                    // Continue arc
                    // In order to have 0 - 360 degree
                    var angleOffset = angle + 180;
                    var arcEndPoint = _this._polarToCartesian(0, 0, _this.options.circleRadius, angleOffset);

                    // Draw the Arc
                    _this._drawSvgArc(arcEndPoint, angleOffset);
                }
            });
        },

        _getRelativePosition: function (x, y) {
            // Get absolute position of svgContainer
            var offset = this.element.svgContainer.offset();
            return {
                x: x - offset.left,
                y: y - offset.top
            };
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
            var pRel = this._getRelativePosition(x, y);
            var angle = this._getAngleFromRelativePosition(pRel.x, pRel.y);
            return this._getTimeFromAngle(angle);
        },

        _getArcPointFromAbsolutePosition: function (x, y) {
            var pRel = this._getRelativePosition(x, y);
            var angle = this._getAngleFromRelativePosition(pRel.x, pRel.y);
            var radianAngle = -1 * (angle + 180) * (Math.PI / 180);

            // See http://math.stackexchange.com/questions/700237/coordinates-of-sector-of-circle
            return {
                x: this.options.circleRadius * Math.cos(radianAngle),
                y: this.options.circleRadius * Math.sin(radianAngle) * -1,
                angle: angle
            };
        },

        _getAngleFromRelativePosition: function (x2, y2) {
            // Position to angle
            var x1y1 = this.svgWidthHeight / 2;
            return Math.atan2(x1y1 - y2, x1y1 - x2) * 180 / Math.PI;
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

            if (this.actualStartTime != null) {
                tooltipText += this._timeObjectToString(this.actualStartTime);
                if (!this.amEnabled || !this.pmEnabled) {
                    tooltipText += ' ' + amPmLabel;
                }
                tooltipText += ' - ';

                // Switch AM/PM if startTime is before 12 and timeObj after 12
                var hourDiff = this.actualStartTime.hours - timeObj.hours;
                if (this.actualStartTime.hours < 12 && (timeObj.hours >= 12 || hourDiff > 0 || hourDiff == 0 && this.actualStartTime.minutes > timeObj.minutes)) {
                    if (amPmLabel == AM_LABEL) {
                        amPmLabel = PM_LABEL;
                    } else if (amPmLabel == PM_LABEL) {
                        amPmLabel = AM_LABEL;
                    }
                }
            }
            tooltipText += this._timeObjectToString(timeObj) + " " + amPmLabel;
            return tooltipText;
        },

        _polarToCartesian: function (centerX, centerY, radius, angleInDegrees) {
            var angleInRadians = angleInDegrees * Math.PI / 180.0;
            var x = centerX + radius * Math.cos(angleInRadians);
            var y = centerY + radius * Math.sin(angleInRadians);
            return {x: x, y: y};
        },

        _getTimeFromAngle: function (angleDeg) {
            var angle = angleDeg + 180;
            var decimalValue = 3.0 - ( 1.0 / 30.0 ) * ( angle % 360 ) * -1;

            // Normalize from 12 - 11
            if (decimalValue < 0)
                decimalValue += 12.0;
            if (decimalValue > 12)
                decimalValue -= 12.0;
            var hours = parseInt(decimalValue);
            if (hours == 0)
                hours = 12;
            var minutes = parseInt(decimalValue * 60) % 60;

            return {hours: hours, minutes: minutes};
        },

        _getIntervalsFromTimeObj : function(startTime, endTime, amEnabled, pmEnabled) {
            var intervals = [];

            // Copy objects
            var firstStart = $.extend({},startTime);
            var firstEnd = $.extend({},endTime);

            if (amEnabled && pmEnabled) {
                var secondStart = $.extend({},startTime);
                var secondEnd = $.extend({},endTime);

                /**
                 * First Interval (startTime is AM)
                 */
                // If startTime is 12 we have to subtract 12 to get 0
                if(startTime.hours == 12) {
                    firstStart.hours -= 12;
                }

                // If endTime is PM we have to add 12
                if(endTime != null) {
                    if(endTime.hours <  startTime.hours && startTime.hours < 12) {
                        firstEnd.hours += 12;
                    }
                    intervals.push({startTime : firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime : firstStart});
                }

                /**
                 * First Interval (startTime is PM)
                 */
                if(startTime.hours < 12) {
                    secondStart.hours += 12;
                }

                // If endTime is AM we have to subtract 12
                if(endTime != null) {
                    if(endTime.hours < 12 && endTime.hours > startTime.hours) {
                        secondEnd.hours += 12;
                    }

                    if (endTime.hours <= startTime.hours && endTime.hours == 12) {
                        secondEnd.hours -= 12;
                    }
                    intervals.push({startTime : secondStart, endTime: secondEnd});
                } else {
                    intervals.push({startTime : secondStart});
                }

            } else if (pmEnabled) {
                if(startTime.hours < 12) {
                    firstStart.hours += 12;
                }

                // If endTime is AM and 12 we have to subtract 12
                if(endTime != null) {
                    if(endTime.hours < 12 && endTime.hours > startTime.hours) {
                        firstEnd.hours += 12
                    }

                    if (endTime.hours <= firstStart.hours && endTime.hours == 12) {
                        firstEnd.hours -= 12;
                    }
                    intervals.push({startTime : firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime : firstStart});
                }

            } else if(amEnabled) {
                if(startTime.hours == 12) {
                    firstStart.hours -= 12;
                }

                // If endTime is PM we have to add 12
                if(endTime != null) {
                    if(endTime.hours <  startTime.hours && startTime.hours < 12) {
                        firstEnd.hours += 12;
                    }

                    intervals.push({startTime : firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime : firstStart});
                }

            } else {
                console.error('Illegal State: AM/PM');
            }

            return intervals;
        },

        _drawSvgArc: function (arcEndPoint, angleOffset) {
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
            if (this.interactionGroups.length != this.intervalCount) {
                console.error("length: " + this.interactionGroups.length);
                console.error("Count:  " + this.intervalCount);
            }

            this.interactionGroups.push(this.svg.group(this.interactionGroupOptions));

            this.arcPath = this.svg.createPath();
            if (arcEndPoint == null) {
                // Just draw a line
                this.arcPath.move(0, 0).line([[0, 0], [this.actualArcStartPoint.x, this.actualArcStartPoint.y]]).close();
            } else {
                // Draw additional arc
                var clockwise;
                var angleDiff = this.actualArcStartPoint.angle + 180 - angleOffset;

                if (this.actualArcStartPoint.angle >= 90 && this.actualArcStartPoint.angle <= 180) {
                    // Between 12 and 3
                    if (angleDiff < 0 && angleDiff > -90
                        || angleDiff <= 360 && angleDiff > 180) {
                        clockwise = 0;
                    } else {
                        clockwise = 1;
                    }
                } else if (this.actualArcStartPoint.angle <= -90 && this.actualArcStartPoint.angle >= -180
                    || this.actualArcStartPoint.angle >= -90 && this.actualArcStartPoint.angle <= 0) {
                    // Between 3 and 9
                    if (angleDiff > -180 && angleDiff < 0) {
                        clockwise = 0;
                    } else {
                        clockwise = 1;
                    }
                } else if (this.actualArcStartPoint.angle >= 0 && this.actualArcStartPoint.angle <= 90) {
                    // Between 9 and 12
                    if (angleDiff < 0 && angleDiff > -180
                        || angleDiff > 180) {
                        clockwise = 0;
                    } else {
                        clockwise = 1;
                    }
                }

                this.arcPath.move(0, 0)
                    .line([[0, 0], [this.actualArcStartPoint.x, this.actualArcStartPoint.y]])
                    .arc(this.options.circleRadius, this.options.circleRadius, 1, clockwise, 1, arcEndPoint.x, arcEndPoint.y)
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
         * @param dist
         * @private
         */
        _createElements: function (dist) {
            var _this = this;

            // Time tooltip
            this.element.tooltipContainer = $('<div></div>').attr('id', 'jh-tooltip-container').hide().appendTo(this.element);
            var amPmButtonContainer;

            if (this.options.showToggleLayoutButton || this.options.enableAmPmButtons) {
                var buttonContainer = $('<div></div>').attr('id', 'jh-button-container').appendTo(this.element);

                if (this.options.showToggleLayoutButton) {
                    var toggleButtonContainer = $('<div></div>').attr('id', 'jh-toggle-button-container').css('float', 'left').appendTo(buttonContainer).css('float', 'right');
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
                    amPmButtonContainer = $('<div></div>').attr('id', 'jh-am-pm-button-container').css('float', 'left').appendTo(buttonContainer);
                    $(' <input type="radio" id="jh-am-button" name="radio" value="' + AM_LABEL + '"><label for="jh-am-button">' + AM_LABEL + '</label>').appendTo(amPmButtonContainer);
                    $(' <input type="radio" id="jh-pm-button" name="radio" value="' + PM_LABEL + '"><label for="jh-pm-button">' + PM_LABEL + '</label>').appendTo(amPmButtonContainer);
                    $(' <input type="radio" id="jh-both-button" name="radio"  value="' + AM_PM_LABEL + '" checked="checked"><label for="jh-both-button">' + AM_PM_LABEL + '</label>').appendTo(amPmButtonContainer);

                    amPmButtonContainer.buttonset();

                    $('input:radio[name=radio]').change(function () {
                        _this.amEnabled = false;
                        _this.pmEnabled = false;
                        if (this.value == AM_LABEL) {
                            _this.amEnabled = true;
                        } else if (this.value == PM_LABEL) {
                            _this.pmEnabled = true;
                        } else if (this.value == AM_PM_LABEL) {
                            _this.amEnabled = true;
                            _this.pmEnabled = true;
                        }
                    });
                }
            }


            this.svgWidthHeight = 2 * (this.options.circleRadius + TEXT_OFFSET);
            if (this.options.showFaceCircle) {
                this.svgWidthHeight += 2 * this.options.faceCircleOptions.strokeWidth
            }
            this.element.svgContainer = $('<div></div>').attr('id', 'jh-svg-container').width(this.svgWidthHeight).height(this.svgWidthHeight).attr('oncontextmenu', "return false;").appendTo(this.element);
            this.element.svgContainer.svg({
                onLoad: drawClock
            });

            function drawClock(svg) {
                _this.svg = svg;
                $(svg.root()).attr('width', '100%').attr('height', '100%');
                //$(svg.root()).removeAttr('width').removeAttr('height').attr('viewBox', '0 0 400 400');
                var radius = _this.options.circleRadius;
                var centerXY = _this.svgWidthHeight / 2;

                if (_this.options.showFaceCircle) {
                    svg.circle(centerXY, centerXY, radius, _this.options.faceCircleOptions);
                }

                // Draw the face
                // 12 to 12
                var svgClockFaceGroup = svg.group({stroke: 'black', transform: 'translate(' + dist + ',' + dist + ')'});

                // Small ticks
                var lengthShort = _this.options.circleRadius - _this.options.faceTicksTinyLength;
                for (var i = 0; i < 360; i += 6) {
                    var tOptions = _this.options.faceTicksTinyOptions;
                    tOptions.transform = 'rotate(' + i + ')';
                    svg.line(svgClockFaceGroup, 0, _this.options.circleRadius, 0, lengthShort, tOptions);
                }

                // Large ticks (12-3-6-9)
                var lengthLong = _this.options.circleRadius - _this.options.faceTicksLargeLength;
                for (i = 0; i < 360; i += 30) {
                    tOptions = _this.options.faceTicksLargeOptions;
                    tOptions.transform = 'rotate(' + i + ')';
                    svg.line(svgClockFaceGroup, 0, _this.options.circleRadius, 0, lengthLong, tOptions);
                }

                // Text
                if (_this.options.showHourLabels) {
                    svg.text(svgClockFaceGroup, 0, _this.options.circleRadius + TEXT_OFFSET, "6");
                    svg.text(svgClockFaceGroup, -_this.options.circleRadius - TEXT_OFFSET, 0, "9");
                    svg.text(svgClockFaceGroup, 0, -_this.options.circleRadius - TEXT_OFFSET, "12");
                    svg.text(svgClockFaceGroup, _this.options.circleRadius + TEXT_OFFSET, 0, "3");
                    $('text', svg.root()).attr('text-anchor', 'middle').addClass('hour-label');
                }

                // Later for ticks
                //svg.path(g, path.move(0,0).line([[0,0], [0,radius]]), {transform:'rotate(30)',stroke:'blue'});
            }
        },

        _destroy: function () {

        },

        _setOption: function (key, value) {
            // TODO: Implement
            //if(name === 'maxItems') {
            //    this._resizeBoxForMaxItemsOf(value);
            //}
            $.Widget.prototype._setOption.apply(this, arguments);
        }
    });
});
