/**
 * jquery.clockIntervalPicker.js - A jQuery plugin for interactive time-interval selection based on a clock metaphor.
 *
 * @version v0.0.0
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
    var MINUTES_PER_DAY = MINUTES_PER_HOUR * 24;
    var DEGREES_CIRCLE = 360;
    var DEGREES_PER_24_HOUR = DEGREES_CIRCLE / HOURS_PER_DAY;
    var DEGREES_PER_12_HOUR = DEGREES_PER_24_HOUR * 2;
    var DEGREES_PER_24_MINUTE = DEGREES_PER_24_HOUR / MINUTES_PER_HOUR;
    var DEGREES_PER_12_MINUTE = DEGREES_PER_12_HOUR / MINUTES_PER_HOUR;

    // SVG Constants
    var SVG_NS = "http://www.w3.org/2000/svg";
    var SVG_ATTR_NAMES = {
        class_: 'class', in_: 'in',
        alignmentBaseline: 'alignment-baseline', baselineShift: 'baseline-shift',
        clipPath: 'clip-path', clipRule: 'clip-rule',
        colorInterpolation: 'color-interpolation',
        colorInterpolationFilters: 'color-interpolation-filters',
        colorRendering: 'color-rendering', dominantBaseline: 'dominant-baseline',
        enableBackground: 'enable-background', fillOpacity: 'fill-opacity',
        fillRule: 'fill-rule', floodColor: 'flood-color',
        floodOpacity: 'flood-opacity', fontFamily: 'font-family',
        fontSize: 'font-size', fontSizeAdjust: 'font-size-adjust',
        fontStretch: 'font-stretch', fontStyle: 'font-style',
        fontVariant: 'font-variant', fontWeight: 'font-weight',
        glyphOrientationHorizontal: 'glyph-orientation-horizontal',
        glyphOrientationVertical: 'glyph-orientation-vertical',
        horizAdvX: 'horiz-adv-x', horizOriginX: 'horiz-origin-x',
        imageRendering: 'image-rendering', letterSpacing: 'letter-spacing',
        lightingColor: 'lighting-color', markerEnd: 'marker-end',
        markerMid: 'marker-mid', markerStart: 'marker-start',
        stopColor: 'stop-color', stopOpacity: 'stop-opacity',
        strikethroughPosition: 'strikethrough-position',
        strikethroughThickness: 'strikethrough-thickness',
        strokeDashArray: 'stroke-dasharray', strokeDashOffset: 'stroke-dashoffset',
        strokeLineCap: 'stroke-linecap', strokeLineJoin: 'stroke-linejoin',
        strokeMiterLimit: 'stroke-miterlimit', strokeOpacity: 'stroke-opacity',
        strokeWidth: 'stroke-width', textAnchor: 'text-anchor',
        textDecoration: 'text-decoration', textRendering: 'text-rendering',
        underlinePosition: 'underline-position', underlineThickness: 'underline-thickness',
        vertAdvY: 'vert-adv-y', vertOriginY: 'vert-origin-y',
        wordSpacing: 'word-spacing', writingMode: 'writing-mode'
    };

    $.widget('jh.clockTimeIntervalPicker', {
        options: {
            multiSelection: true,
            enableAmPmButtons: true,
            showToggleLayoutButton: true,
            useTwelveHoursLayout: true,
            showHourLabels: true,
            selectionTicksMinutes: 1,
            showIndicatorLine: true,
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
            showFaceCircle: false,
            faceCircleOptions: {
                fillOpacity: 0,
                stroke: 'black',
                strokeOpacity: 1,
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
            // Interaction
            this.actualStartTime = null;
            this.selectedIntervals = [];
            this.intervalCount = 0;
            this.ctrlHold = false;
            this.amEnabled = true;
            this.pmEnabled = true;
            this.startAngles = [];
            this.endAngles = [];

            // Layout
            this.twelveHoursLayout = this.options.useTwelveHoursLayout;

            // Create Basic UI
            this.buttonContainerHeight = 0;
            this._createBasicUIElement();

            // Drawing based on interaction
            this.interactionGroupOptions = this.options.faceOverlayOptions;
            this.actualArcStartPoint = {};
            this.arcPath = null;
            this.interactionGroups = [];
            this.svg = null;
            this.indicatorLineGroup = null;

            this.element.addClass('jh-time-picker');

            // Drawing (SVG)
            this._initSVGSizeVariables();

            // Init ticks for minutes w.r.t to statrt angle of given minute
            // NOTE: We will start at 00:00 / 12:00
            this.ticksMinutes = [];
            var numTicks = MINUTES_PER_DAY / this.options.selectionTicksMinutes;
            for (var i = 0; i <= numTicks; i++) {
                this.ticksMinutes.push(i * this.options.selectionTicksMinutes);
            }

            // Init SVG elements
            this.element.svgContainer = $('<div></div>').addClass('jh-svg-container')
                .width(this.availableSVGWidth)
                .height(this.availableSVGHeight)
                .attr('oncontextmenu', "return false;")
                .appendTo(this.element);
            //this.element.svgContainer = $('<div></div>').addClass('jh-svg-container').width('100%').height('100%').attr('oncontextmenu', "return false;").appendTo(this.element);
            this._createSVGElements();

            this._initMouseEventHandlers();
        },

        _initSVGSizeVariables: function () {
            this.availableWidth = this.element.width();
            this.availableHeight = this.element.height();
            this.availableSVGWidth = this.availableWidth;
            this.availableSVGHeight = this.availableHeight - this.buttonContainerHeight;

            this.svgWidthHeight = Math.min(this.availableSVGWidth, this.availableSVGHeight);
            this.circleRadius = this.svgWidthHeight / 2;
            if (this.options.showFaceCircle) {
                this.circleRadius -= (2 * this.options.faceCircleOptions.strokeWidth);
            }
            if (this.options.showHourLabels) {
                this.hourLabelFontSize = parseInt(this._getCssClassValue('hour-label', 'font-size'));
                this.circleRadius -= 2 * this.hourLabelFontSize;
            }
            this.middle = this.svgWidthHeight / 2;
            this.interactionGroupOptions.transform = 'translate(' + this.middle + ',' + this.middle + ')';
        },

        _initMouseEventHandlers: function () {
            var _this = this;
            var lastY = 0;
            var lastX = 0;
            var mouseDown = false;

            this.element.svgContainer.mousedown(function (event) {
                _this._clearTextSelection();

                // Right Click to reset / select all if no interval exists
                if (event.which === 3) {
                    if (_this.intervalCount > 0) {
                        _this._clearSelection();
                        _this.element.trigger("selectionChanged", {
                            intervals: {}
                        });
                    } else {
                        if (_this.amEnabled) {
                            _this.selectedIntervals.push({
                                startTime: {
                                    hours: 0,
                                    minutes: 0
                                },
                                endTime: {
                                    hours: 11,
                                    minutes: 59
                                }
                            });
                        }
                        if (_this.pmEnabled) {
                            _this.selectedIntervals.push({
                                startTime: {
                                    hours: 12,
                                    minutes: 0
                                },
                                endTime: {
                                    hours: 23,
                                    minutes: 59
                                }
                            });
                        }

                        // Draw a Circle
                        _this.interactionGroups.push(_this._createSvgGroup(_this.svg, _this.interactionGroupOptions));
                        _this._createSvgCircle(_this.interactionGroups[_this.intervalCount], 0, 0, _this.circleRadius);

                        _this.intervalCount++;
                        _this.startAngles.push(0);
                        _this.endAngles.push(0);
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
                _this._createSvgArc(_this.actualArcStartPoint);

                mouseDown = true;
                _this.element.trigger("selectionStarted", {
                    intervals: _this._getIntervalsFromTimeObj(_this.actualStartTime, null, _this.amEnabled, _this.pmEnabled)
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

                _this.startAngles.push(_this._degreesToRadian(_this._getAngleFromTime(_this.actualStartTime.hours, _this.actualStartTime.minutes)));
                _this.endAngles.push(_this._degreesToRadian(_this._getAngleFromTime(actualEndTime.hours, actualEndTime.minutes)));

                _this.actualStartTime = null;
                _this.element.trigger("selectionEnded", {
                    intervals: intervals
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
                    _this._createSvgArc(_this.actualArcStartPoint, arcEndPoint);
                }

                _this._drawIndicatorLine(tickAngle);
            });
        },

        _getTickTime: function (hours, minutes) {
            // Correct time it should be according to ticks
            var totalMinutes = hours * MINUTES_PER_HOUR + minutes;

            // Find nearest element in array regarding total minute
            var tickTotalMinutes;
            for (var i = 0; i < this.ticksMinutes.length - 1; i++) {
                var t = this.ticksMinutes[i];
                var tNext = this.ticksMinutes[i + 1];
                if (totalMinutes >= t && totalMinutes <= tNext) {
                    // We have the correct position, determine correct tick
                    var diff = totalMinutes - t;
                    var diffNext = tNext - totalMinutes;
                    if (diff < diffNext) {
                        tickTotalMinutes = t;
                    } else {
                        tickTotalMinutes = tNext;
                    }
                    break;
                }
            }

            var tickHours = parseInt(tickTotalMinutes / MINUTES_PER_HOUR);
            if (tickHours === 24) {
                tickHours = 0;
            }

            return {
                hours: tickHours,
                minutes: tickTotalMinutes % MINUTES_PER_HOUR
            };
        },

        _polarToCartesian: function (dist, angle) {
            // See http://math.stackexchange.com/questions/700237/coordinates-of-sector-of-circle
            return {
                x: dist * Math.sin(angle),
                y: dist * Math.cos(angle) * -1,
                angle: angle
            };
        },

        _drawIndicatorLine: function (angle) {
            // Draw Indicator Line
            this._clearIndicatorLine();
            var translateOpt = {
                transform: 'translate(' + this.middle + ',' + this.middle + ')'
            };
            this.indicatorLineGroup = this._createSvgGroup(this.svg, translateOpt);
            this.options.indicatorLineOptions.transform = 'rotate(' + this._radianToDegrees(angle) + ')';
            this._createSvgLine(this.indicatorLineGroup, 0, 0, 0, -this.circleRadius, this.options.indicatorLineOptions);
        },

        _clearIndicatorLine: function () {
            // Clear Indicator Line
            if (this.indicatorLineGroup !== null) {
                this._removeElement(this.indicatorLineGroup);
                this.indicatorLineGroup = null;
            }
        },

        _getCssClassValue: function (className, attributeName) {
            var $p = $("<p></p>").addClass(className).hide().appendTo(this.element);
            var value = $p.css(attributeName);
            $p.remove();
            return value;
        },

        _clearTextSelection: function () {
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

        _radianToDegrees: function (angle) {
            return angle * (180 / Math.PI);
        },

        _degreesToRadian: function (angle) {
            return angle * (Math.PI / 180);
        },

        _getTooltipText: function (timeObj) {
            var tooltipText = "";
            var amPmLabel = "";

            if (this.twelveHoursLayout) {
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
            if (this.twelveHoursLayout) {
                decimalValue = 6.0 - ( 1.0 / 30.0 ) * ( (this._radianToDegrees(angle) + DEGREES_CIRCLE / 2) % DEGREES_CIRCLE ) * -1;
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

        _getAngleFromTime: function (hours, minutes) {
            var angle;
            if (this.twelveHoursLayout) {
                angle = hours * DEGREES_PER_12_HOUR + minutes * DEGREES_PER_12_MINUTE;
            } else {
                angle = hours * DEGREES_PER_24_HOUR + minutes * DEGREES_PER_24_MINUTE;
            }
            return angle;
        },

        _getIntervalsFromTimeObj: function (startTime, endTime, amEnabled, pmEnabled) {
            var intervals = [];
            var _self = this;
            if (!_self.twelveHoursLayout) {
                // 24h Layout: Just return the interval
                intervals.push({startTime: startTime, endTime: endTime});
                return intervals;
            }

            // Copy objects
            var firstStart = $.extend({}, startTime);
            if (startTime.hours === 12) {
                firstStart.hours = 0;
            }

            var firstEnd = $.extend({}, endTime);
            if (endTime !== null && endTime.hours === 12) {
                firstEnd.hours = 0;
            }

            if (amEnabled) {
                if (endTime !== null) {
                    // Check whether endTime should be PM
                    if (firstEnd.hours < firstStart.hours || firstEnd.hours === firstStart.hours && firstEnd.minutes < firstStart.minutes) {
                        firstEnd.hours += 12;
                    }

                    intervals.push({startTime: firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime: firstStart});
                }
            }

            if (pmEnabled) {
                // Copy objects
                firstStart = $.extend({}, startTime);
                if (startTime.hours === 12) {
                    firstStart.hours = 0;
                }

                firstEnd = $.extend({}, endTime);
                if (endTime !== null && endTime.hours === 12) {
                    firstEnd.hours = 0;
                }

                if (endTime !== null) {
                    // Check whether endTime should be AM
                    if (firstEnd.hours < firstStart.hours || firstEnd.hours === firstStart.hours && firstEnd.minutes < firstStart.minutes) {
                        firstEnd.hours -= 12;
                    }

                    firstEnd.hours += 12;
                    firstStart.hours += 12;

                    intervals.push({startTime: firstStart, endTime: firstEnd});
                } else {
                    intervals.push({startTime: firstStart});
                }
            }
            return intervals;
        },

        _redrawSvgArcs: function () {
            // Reinit new interaction groups
            this.interactionGroups = [];
            for (var i = 0; i < this.intervalCount; i++) {
                this.interactionGroups.push(this._createSvgGroup(this.svg, this.interactionGroupOptions));
            }

            // We have to use the angles to draw the args
            for (i = 0; i < this.intervalCount; i++) {
                if (this.startAngles[i] === 0 && this.endAngles[i] === 0) {
                    // Everything selected - draw a circle
                    this.interactionGroups.push(this._createSvgGroup(this.svg, this.interactionGroupOptions));
                    this._createSvgCircle(this.interactionGroups[this.intervalCount], 0, 0, this.circleRadius);
                } else {
                    var startPoint = this._polarToCartesian(this.circleRadius, this.startAngles[i]);
                    var endPoint = this._polarToCartesian(this.circleRadius, this.endAngles[i]);

                    // Draw the Arc
                    startPoint.angle = this.startAngles[i];
                    endPoint.angle = this.endAngles[i];
                    this._drawSvgArc(startPoint, endPoint, this.interactionGroups[i]);
                }
            }
        },

        _createSvgArc: function (arcStartPoint, arcEndPoint) {
            // See http://stackoverflow.com/questions/21205652/how-to-draw-a-circle-sector-in-css/21206274#21206274
            // See http://svg.tutorial.aptico.de/start3.php?knr=10&kname=Pfade&uknr=10.8&ukname=A%20und%20a%20-%20Bogenkurven
            if (!this.ctrlHold) {
                // Clear all arcs
                this._clearArcGroups();
            } else {
                // Clear only last arc if there is one
                if (this.interactionGroups.length > this.intervalCount) {
                    for (var i = this.intervalCount; i < this.interactionGroups.length; i++) {
                        this._removeElement(this.interactionGroups[i]);
                        this.interactionGroups.pop();
                    }
                }
            }
            if (this.interactionGroups.length !== this.intervalCount) {
                console.error("length: " + this.interactionGroups.length);
                console.error("Count:  " + this.intervalCount);
            }
            this.interactionGroups.push(this._createSvgGroup(this.svg, this.interactionGroupOptions));
            this._drawSvgArc(arcStartPoint, arcEndPoint, this.interactionGroups[this.intervalCount]);
        },

        _drawSvgArc: function (arcStartPoint, arcEndPoint, parent) {
            // Draw a line
            this.arcPath = this._svgPathMove(0, 0) + this._svgPathLine(0, 0, arcStartPoint.x, arcStartPoint.y);
            if (typeof arcEndPoint !== 'undefined' && arcEndPoint !== null) {
                // Draw additional arc
                var aDiff = arcEndPoint.angle - arcStartPoint.angle;
                var clockwise = false;
                if (aDiff > Math.PI) {
                    clockwise = true;
                }
                if (aDiff < 0 && aDiff > Math.PI * -1) {
                    clockwise = !clockwise;
                }

                this.arcPath += this._svgPathArc(this.circleRadius, this.circleRadius, 1, clockwise, 1, arcEndPoint.x, arcEndPoint.y) + this._svgPathLine(arcEndPoint.x, arcEndPoint.y, 0, 0);
            }
            this._svgPathCloseAndAppend(parent, this.arcPath);
        },

        _clearArcGroups: function () {
            if (this.interactionGroups.length > 0) {
                for (var i = 0; i < this.interactionGroups.length; i++) {
                    this._removeElement(this.interactionGroups[i]);
                }
            }
            this.interactionGroups = [];
        },

        _clearSelection: function () {
            this.actualStartTime = null;
            this.actualArcStartPoint = {};
            this.intervalCount = 0;
            this.selectedIntervals = [];
            this.startAngles = [];
            this.endAngles = [];

            this._clearArcGroups();
            this.arcPath = null;
        },

        _clearSVGElements: function () {
            this.element.svgContainer.empty();
            this.element.svgContainer.removeClass('hasSVG');
            this.interactionGroups = [];
        },

        _timeObjectToString: function (timeObj) {
            var hours = timeObj.hours;
            if (hours === 0 && this.twelveHoursLayout) {
                hours = 12;
            }
            return ( hours < 10 ? "0" + hours : hours ) + ":" + (timeObj.minutes < 10 ? "0" + timeObj.minutes : timeObj.minutes);
        },

        /**
         *
         * @private
         */
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
                $('<label class="radio-inline"><input type="radio" id="jh-am-button" name="radio" value="1">' + AM_LABEL + '</label>').appendTo(amPmButtonContainer);
                $('<label class="radio-inline"><input type="radio" id="jh-pm-button" name="radio" value="2">' + PM_LABEL + '</label>').appendTo(amPmButtonContainer);
                $('<label class="radio-inline"><input type="radio" id="jh-both-button" name="radio" value="3" checked="checked">' + AM_PM_LABEL + '</label>').appendTo(amPmButtonContainer);

                $('input:radio[name=radio]').change(function () {
                    var id = $('input:radio[name=radio]:checked').attr('id');
                    _this.amEnabled = false;
                    _this.pmEnabled = false;
                    if (id === 'jh-am-button') {
                        _this.amEnabled = true;
                    } else if (id === 'jh-pm-button') {
                        _this.pmEnabled = true;
                    } else if (id === 'jh-both-button') {
                        _this.amEnabled = true;
                        _this.pmEnabled = true;
                    }

                    _this.element.trigger("layoutChanged", {
                        amEnabled: _this.amEnabled,
                        pmEnabled: _this.pmEnabled,
                        twelveHoursLayout: _this.twelveHoursLayout
                    });
                });
            }

            var layoutButton;
            if (this.options.showToggleLayoutButton) {
                var toggleButtonContainer = $('<div></div>').addClass('jh-toggle-button-container').appendTo(buttonContainer);
                $('<label class="checkbox-inline"><input  id="clockLayout" type="checkbox">24h</label>').appendTo(toggleButtonContainer);
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
                    _this._clearSelection();
                    _this._createSVGElements();

                    _this.element.trigger("layoutChanged", {
                        amEnabled: _this.amEnabled,
                        pmEnabled: _this.pmEnabled,
                        twelveHoursLayout: _this.twelveHoursLayout
                    });
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
            console.log(this.buttonContainerHeight);
        },

        /**
         *
         * @private
         */
        _createSVGElements: function () {
            var _this = this;

            var minWidthHeight = Math.min(this.availableSVGWidth, this.availableSVGHeight);

            this.svg = document.createElementNS(SVG_NS, 'svg');
            this.svg.setAttribute('version', '1.1');
            this.svg.setAttribute('width', ''+minWidthHeight);
            this.svg.setAttribute('height', ''+minWidthHeight);
            this.svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            this.svg.setAttribute('viewBox', '0 0 ' + _this.svgWidthHeight + ' ' + _this.svgWidthHeight);
            this.element.svgContainer.append(this.svg);

            var radius = _this.circleRadius;

            if (_this.options.showFaceCircle) {
                _this._createSvgCircle(this.svg, _this.middle, _this.middle, radius, _this.options.faceCircleOptions);
            }

            // Draw the face
            // 12 to 12
            var svgClockFaceGroup = _this._createSvgGroup(this.svg, {
                stroke: 'black',
                transform: 'translate(' + _this.middle + ',' + _this.middle + ')'
            });

            // Small ticks
            var lengthShort = _this.circleRadius - _this.options.faceTicksTinyLength;
            var tOptions = _this.options.faceTicksTinyOptions;
            var degreesPerTick = 6;
            if (!_this.twelveHoursLayout) {
                degreesPerTick /= 2;
            }
            for (var i = 0; i < DEGREES_CIRCLE; i += degreesPerTick) {
                tOptions.transform = 'rotate(' + i + ')';
                _this._createSvgLine(svgClockFaceGroup, 0, _this.circleRadius, 0, lengthShort, tOptions);
            }

            // Large ticks (12-3-6-9)
            var lengthLong = _this.circleRadius - _this.options.faceTicksLargeLength;
            degreesPerTick = DEGREES_PER_12_HOUR;
            if (!_this.twelveHoursLayout) {
                degreesPerTick = DEGREES_PER_24_HOUR;
            }
            for (i = 0; i < DEGREES_CIRCLE; i += degreesPerTick) {
                tOptions = _this.options.faceTicksLargeOptions;
                tOptions.transform = 'rotate(' + i + ')';
                _this._createSvgLine(svgClockFaceGroup, 0, _this.circleRadius, 0, lengthLong, tOptions);
            }

            // Text
            if (_this.options.showHourLabels) {
                var className = 'hour-label';
                var opt = {
                    textAnchor: 'middle'
                };
                if (_this.twelveHoursLayout) {
                    _this._createSvgText(svgClockFaceGroup, 0, -_this.circleRadius - 12, "12", className, opt);
                    _this._createSvgText(svgClockFaceGroup, 0, _this.circleRadius + _this.hourLabelFontSize + 6, "6", className, opt);
                    _this._createSvgText(svgClockFaceGroup, -_this.circleRadius - _this.hourLabelFontSize, _this.hourLabelFontSize / 4, "9", className, opt);
                    _this._createSvgText(svgClockFaceGroup, _this.circleRadius + _this.hourLabelFontSize, _this.hourLabelFontSize / 4, "3", className, opt);
                } else {
                    _this._createSvgText(svgClockFaceGroup, 0, -_this.circleRadius - 12, "0", className, opt);
                    _this._createSvgText(svgClockFaceGroup, 0, _this.circleRadius + _this.hourLabelFontSize + 6, "12", className, opt);
                    _this._createSvgText(svgClockFaceGroup, -_this.circleRadius - _this.hourLabelFontSize, _this.hourLabelFontSize / 4, "18", className, opt);
                    _this._createSvgText(svgClockFaceGroup, _this.circleRadius + _this.hourLabelFontSize, _this.hourLabelFontSize / 4, "6", className, opt);
                }
            }
        },

        _setSvgElementAttributes: function (element, options) {
            for (var attr in options) {
                var value = options[attr];
                if (value !== null) {
                    element.setAttribute(SVG_ATTR_NAMES[attr] || attr, value);
                }
            }
        },

        _createSvgCircle: function (parent, cx, cy, radius, options) {
            var circle = this._createSvgElement(parent, 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', radius);
            this._setSvgElementAttributes(circle, options);
            parent.appendChild(circle);
            return circle;
        },

        _createSvgLine: function (parent, x1, y1, x2, y2, options) {
            var line = this._createSvgElement(parent, 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            this._setSvgElementAttributes(line, options);
            return line;
        },

        _createSvgGroup: function (parent, options) {
            var group = this._createSvgElement(parent, 'g');
            this._setSvgElementAttributes(group, options);
            return group;
        },

        _createSvgText: function (parent, x, y, textValue, className, options) {
            var text = this._createSvgElement(parent, 'text');
            text.innerHTML = textValue;
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute("class", className);
            this._setSvgElementAttributes(text, options);
            return text;
        },

        _svgPathLine: function (x1, y1, x2, y2) {
            return this._svgPathCoordinatesArr('L', [[x1, y1], [x2, y2]]);
        },

        _svgPathMove: function (x, y) {
            return this._svgPathCoordinates('M', x, y);
        },

        _svgPathArc: function (rx, ry, xRotate, large, clockwise, x, y) {
            var p = 'A';
            p += rx + ',' + ry + ' ' + xRotate + ' ' +
                (large ? '1' : '0') + ',' + (clockwise ? '1' : '0') + ' ' + x + ',' + y;
            return p;
        },

        _svgPathCloseAndAppend: function (parent, attributeString) {
            var path = this._createSvgElement(parent, 'path');
            attributeString += 'z';
            path.setAttribute('d', attributeString);
            return path;
        },

        _svgPathCoordinates: function (cmd, x1, y1) {
            var p = '';
            p += cmd + x1 + ',' + y1;
            return p;
        },

        _svgPathCoordinatesArr: function (cmd, arr) {
            var p = '';
            for (var i = 0; i < arr.length; i++) {
                var str = arr[i];
                p += (i === 0 ? cmd : ' ') + str[0] + ',' + str[1] + (str.length < 4 ? '' :
                    ' ' + str[2] + ',' + str[3] + (str.length < 6 ? '' : ' ' + str[4] + ',' + str[5]));
            }
            return p;
        },

        _createSvgElement: function (parent, tagName) {
            var el = document.createElementNS(SVG_NS, tagName);
            parent.appendChild(el);
            return el;
        },

        _removeElement: function (element) {
            element.parentElement.removeChild(element);
        },

        _destroy: function () {

        },

        _setOption: function (key, value) {
            // Gets called for each key value pair in
            this.options[key] = value;
            //this._update();

            // TODO: Implement
            //if(key === 'maxItems') {
            //    this._resizeBoxForMaxItemsOf(value);
            //}
            //$.Widget.prototype._setOption.apply(this, arguments);
        },

        refresh: function () {
            this._clearSVGElements();
            this._initSVGSizeVariables();
            this.element.svgContainer
                .width(this.availableSVGWidth)
                .height(this.availableSVGHeight);
            this._createSVGElements();
            this._redrawSvgArcs();
        },

        layoutData: function () {
            var _self = this;
            return {
                twelveHoursLayout: _self.twelveHoursLayout,
                amEnabled: _self.amEnabled,
                pmEnabled: _self.pmEnabled
            };
        }
    });
});
