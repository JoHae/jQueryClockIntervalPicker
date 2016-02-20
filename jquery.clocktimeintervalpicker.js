/**
 * main.js  - 17.02.2016
 *
 * @author Johannes Haeussler - Johannes.3.Haeussler(at)uni-konstanz.de
 * @version 1.0
 */
$(function () {
    $.widget('jh.clockTimeIntervalPicker', {
        options: {
            width: 500,
            height: 500,
            radius: 200,
            multiSelection: true,
            showFaceCircle : false,
            faceCircleOptions : {
                fill: '#f1f1f1',
                fillOpacity : 1.0,
                stroke: 'black',
                strokeOpacity : 0.0,
                strokeWidth: 0
            },
            faceOverlayOptions : {
                fill: 'blue',
                fillOpacity : 0.4,
                stroke: 'blue',
                strokeOpacity : 0.4,
                strokeWidth: 2
            }
        },

        _create: function () {
            var lastY = 0;
            var lastX = 0;
            var _this = this;

            var actualStartTime = null;
            var actualEndTime = null;
            var selectedIntervals = [];
            var intervalCount = 0;

            var mousedown = false;
            var appendMode = false;

            var actualArcStartPoint = {};
            var arcPath = null;
            var interactionGroups = [];

            var dist = _this.options.radius
            if(_this.options.showFaceCircle) {
                dist += _this.options.faceCircleOptions.strokeWidth;
            }
            var interactionGroupOptions = this.options.faceOverlayOptions;
            interactionGroupOptions.transform = 'translate(' + dist + ',' + dist + ')';

            this.svg = null;
            this.element.css('width', this.options.width);
            this.element.css('height', this.options.height);

            /**
             * Public Functions
             */
            this.getRelativePosition = function (x, y) {
                // Get absolute position of svgContainer
                var offset = _this.element.svgContainer.offset();
                return {
                    x: x - offset.left,
                    y: y - offset.top
                };
            }

            this.getAngleFromRelativePosition = function (x2, y2) {
                // Position to angle
                var x1y1 = _this.svgWidthHeight / 2;
                return Math.atan2(x1y1 - y2, x1y1 - x2) * 180 / Math.PI;
            }

            /**
             * Init elements
             */
            this._createElements(dist);

            /**
             * Mouse Events
             */
            this.element.svgContainer.mousedown(function (event) {
                // Right Click to reset
                if (event.which == 3) {
                    clearSelection();
                    return;
                }

                // Check ctrl hold for append mode
                appendMode = event.ctrlKey && _this.options.multiSelection;
                if (!appendMode) {
                    clearSelection();
                }

                // Start an arc path and draw a line
                actualArcStartPoint = getArcPointFromAbsolutePosition(event.pageX, event.pageY);
                drawSvgArc(null);

                // Set start time
                actualStartTime = getTimeFromAbsolutePosition(event.pageX, event.pageY);

                mousedown = true;

                _this.element.trigger("selectionStarted", {startTime : actualStartTime});
            });

            this.element.svgContainer.mouseup(function (event) {
                if (event.which == 3) {
                    return;
                }

                // End arc
                actualEndTime = getTimeFromAbsolutePosition(event.pageX, event.pageY);
                intervalCount++;
                mousedown = false;

                var intervalObject = {startTime: actualStartTime, endTime: actualEndTime};
                selectedIntervals.push(intervalObject);
                _this.element.trigger("selectionEnded", intervalObject);
                _this.element.trigger("selectionChanged", {intervals : selectedIntervals});
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

                var pRel = _this.getRelativePosition(lastX, lastY);
                var angle = _this.getAngleFromRelativePosition(pRel.x, pRel.y);
                var time = getTimeFromAngle(angle);

                _this.element.tooltipContainer.css('left', lastX + 15).css('top', lastY).text(time);


                if (mousedown) {
                    // Continue arc
                    var radius = _this.options.radius;

                    // In order to have 0 - 360 degree
                    var angleOffset = angle + 180;
                    var arcEndPoint = polarToCartesian(0, 0, radius, angleOffset);

                    // Draw the Arc
                    drawSvgArc(arcEndPoint, angleOffset);

                    // Clear Text Selection since sometimes it selects labels (e.g. the timelabel)
                    clearTextSelection();
                }
            });

            function clearSelection() {
                actualStartTime = null;
                actualArcStartPoint = {};
                intervalCount = 0;
                selectedIntervals = [];

                clearArcGroups();
                arcPath = null;

            }

            function clearArcGroups() {
                if (interactionGroups.length > 0) {
                    for (var i = 0; i < interactionGroups.length; i++) {
                        _this.svg.remove(interactionGroups[i]);
                    }
                }
                interactionGroups = [];
            }

            function getArcPointFromAbsolutePosition(x, y) {
                var pRel = _this.getRelativePosition(x, y);
                var angle = _this.getAngleFromRelativePosition(pRel.x, pRel.y);
                var radianAngle = -1 * (angle + 180) * (Math.PI / 180);

                // See http://math.stackexchange.com/questions/700237/coordinates-of-sector-of-circle
                return {
                    x: _this.options.radius * Math.cos(radianAngle),
                    y: _this.options.radius * Math.sin(radianAngle) * -1,
                    angle: angle
                };
            }

            function drawSvgArc(arcEndPoint, angleoffset) {
                // See http://stackoverflow.com/questions/21205652/how-to-draw-a-circle-sector-in-css/21206274#21206274
                // See http://svg.tutorial.aptico.de/start3.php?knr=10&kname=Pfade&uknr=10.8&ukname=A%20und%20a%20-%20Bogenkurven
                if (!appendMode) {
                    // Clear all arcs
                    clearArcGroups();
                } else {
                    // Clear only last arc if there is one
                    if (interactionGroups.length >= intervalCount) {
                        for (var i = intervalCount; i < interactionGroups.length; i++) {
                            _this.svg.remove(interactionGroups[i]);
                            interactionGroups.pop();
                        }
                    }
                }
                if (interactionGroups.length != intervalCount) {
                    console.error("length: " + interactionGroups.length);
                    console.error("Count:  " + intervalCount);
                }

                interactionGroups.push(_this.svg.group(interactionGroupOptions));

                arcPath = _this.svg.createPath();
                if (arcEndPoint == null) {
                    // Just draw a line
                    arcPath.move(0, 0).line([[0, 0], [actualArcStartPoint.x, actualArcStartPoint.y]]).close();
                } else {
                    // Draw additional arc
                    var clockwise;
                    var angleDiff = actualArcStartPoint.angle + 180 - angleoffset;

                    if (actualArcStartPoint.angle >= 90 && actualArcStartPoint.angle <= 180) {
                        // Between 12 and 3
                        if (angleDiff < 0 && angleDiff > -90
                            || angleDiff <= 360 && angleDiff > 180) {
                            clockwise = 0;
                        } else {
                            clockwise = 1;
                        }
                    } else if (actualArcStartPoint.angle <= -90 && actualArcStartPoint.angle >= -180
                        || actualArcStartPoint.angle >= -90 && actualArcStartPoint.angle <= 0) {
                        // Between 3 and 9
                        if (angleDiff > -180 && angleDiff < 0) {
                            clockwise = 0;
                        } else {
                            clockwise = 1;
                        }
                    } else if (actualArcStartPoint.angle >= 0 && actualArcStartPoint.angle <= 90) {
                        // Between 9 and 12
                        if (angleDiff < 0 && angleDiff > -180
                            || angleDiff > 180) {
                            clockwise = 0;
                        } else {
                            clockwise = 1;
                        }
                    }

                    arcPath.move(0, 0)
                        .line([[0, 0], [actualArcStartPoint.x, actualArcStartPoint.y]])
                        .arc(_this.options.radius, _this.options.radius, 1, clockwise, 1, arcEndPoint.x, arcEndPoint.y)
                        .line([[arcEndPoint.x, arcEndPoint.y], [0, 0]])
                        .close();
                }
                _this.svg.path(interactionGroups[intervalCount], arcPath);
            }

            function getTimeFromAbsolutePosition(x, y) {
                var pRel = _this.getRelativePosition(x, y);
                var angle = _this.getAngleFromRelativePosition(pRel.x, pRel.y);
                return getTimeFromAngle(angle);
            }

            /**
             *
             * @param centerX
             * @param centerY
             * @param radius
             * @param angleInDegrees
             * @returns {{x: *, y: *}}
             */
            function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
                var angleInRadians = angleInDegrees * Math.PI / 180.0;
                var x = centerX + radius * Math.cos(angleInRadians);
                var y = centerY + radius * Math.sin(angleInRadians);
                return {x: x, y: y};
            }

            /**
             *
             * @param angleDeg
             * @returns {string}
             */
            function getTimeFromAngle(angleDeg) {
                // Angle to time
                var angle = angleDeg + 180;
                var time = "";
                var decimalValue = 3.0 - ( 1.0 / 30.0 ) * ( angle % 360 ) * -1;
                if (decimalValue < 0)
                    decimalValue += 12.0;
                if (decimalValue > 12)
                    decimalValue -= 12.0;
                var hours = parseInt(decimalValue);
                if (hours == 0)
                    hours = 12;
                time += ( hours < 10 ? "0" + hours : hours ) + ":";
                var minutes = parseInt(decimalValue * 60) % 60;
                time += minutes < 10 ? "0" + minutes : minutes;
                return time;
            }

            function clearTextSelection() {
                if (window.getSelection) {
                    if (window.getSelection().empty) {  // Chrome
                        window.getSelection().empty();
                    } else if (window.getSelection().removeAllRanges) {  // Firefox
                        window.getSelection().removeAllRanges();
                    }
                } else if (document.selection) {  // IE?
                    document.selection.empty();
                }
            }
        },

        _createElements: function (dist) {
            var _this = this;

            // Time tooltip
            this.element.tooltipContainer = $('<div></div>').attr('id', 'jh-tooltip-container').hide().appendTo(this.element);

            // AM/PM Buttons
            var buttonContainer = $('<div></div>').attr('id', 'jh-button-container').appendTo(this.element);

            $(' <input type="checkbox" id="jh-am-button"><label for="jh-am-button">AM</label>').appendTo(buttonContainer);
            $(' <input type="checkbox" id="jh-pm-button"><label for="jh-pm-button">PM</label>').appendTo(buttonContainer);
            buttonContainer.buttonset();

            this.svgWidthHeight = 2 * this.options.radius;
            if(this.options.showFaceCircle) {
                this.svgWidthHeight += 2 * this.options.faceCircleOptions.strokeWidth
            }
            this.element.svgContainer = $('<div></div>').attr('id', 'jh-svg-container').width(this.svgWidthHeight).height(this.svgWidthHeight).attr('oncontextmenu', "return false;").appendTo(this.element);
            this.element.svgContainer.svg({
                onLoad: drawClock
            });

            function drawClock(svg) {
                _this.svg = svg;
                var radius = _this.options.radius;
                var centerXY = _this.svgWidthHeight / 2;

                if(_this.options.showFaceCircle) {
                    svg.circle(centerXY, centerXY, radius, _this.options.faceCircleOptions);
                }

                // Draw the face
                // 12 to 12
                var svgClockFaceGroup = svg.group({stroke: 'black', transform: 'translate(' + dist + ',' + dist + ')'});

                // 12-3-6-9
                var lengthShort = _this.options.radius - 5;
                for (var i = 0; i < 360; i += 6) {
                    svg.line(svgClockFaceGroup, 0, _this.options.radius, 0, lengthShort, {
                        strokeWidth: 2,
                        transform: 'rotate(' + i + ')'
                    });
                }

                // 12-3-6-9
                var lengthLong = _this.options.radius - 10;
                for (var i = 0; i < 360; i += 30) {
                    svg.line(svgClockFaceGroup, 0, _this.options.radius, 0, lengthLong, {
                        strokeWidth: 5,
                        transform: 'rotate(' + i + ')'
                    });
                }

                // Later for ticks
                //svg.path(g, path.move(0,0).line([[0,0], [0,radius]]), {transform:'rotate(30)',stroke:'blue'});
            }
        },

        _destroy: function () {
        },

        _setOption: function (key, value) {
        }
    });
});
