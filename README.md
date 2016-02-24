# jQueryClockIntervalPicker

##What ?
A jQuery plugin for interactive time-interval selection based on a clock metaphor.

##Example
visit the [Project Page](http://johae.github.io/jQueryClockIntervalPicker) or see example folder of the repository .

##Usage - Interaction
| Commands | `no key` | `Ctrl-hold` |
| --- | --- | --- |
| `click` | Select a point in time. | - |
| `double-click` | Select everything. | - |
| `right-click` | Reset all intervals. | - |
| `drag 'n' drop` | Reset current. Select interval. | Add selection. |

##Usage - Events
```html
<div id="time-picker"></div>
```
...
```javascript
$( "#time-picker" ).clockTimeIntervalPicker()
    .on( "selectionStarted", function( event, timeObj ) {
        // Selection started Event - Returns the startTime
    })
    .on( "selectionEnded", function( event, interval ) {
        // Selection ended Event - Returns selected interval
    })
    .on( "selectionChanged", function( event, data ) {
        // Selection changed Event - Returns all intervals
    });
```

##Options
You can pass an options object on initialization:
```javascript
$( "#time-picker" ).clockTimeIntervalPicker({circleRadius : 100});
```

### List of available Options
| Option | Description | Default |
| --- | --- | --- |
| `circleRadius` |  | |
| `multiSelection` | | |
| `enableAmPmButtons` |  | |
| `faceTicksLargeLength` |  | |
| `faceTicksLargeOptions` | | |
| `faceTicksTinyLength` | | |
| `faceTicksTinyOptions` | | |
| `faceCircleOptions` | | |
| `faceOverlayOptions` | | |

##Requirements
- [jQuery 2.2.0](https://jquery.com)
- [jQuery UI 1.11.4](https://jquery.com)
- [jQuery SVG 1.5.0](https://jquery.com)

Other versions could work as well but are not tested yet.

##Found a bug or got ideas for new features ? 

Submit an issue above or here: 

<https://github.com/JoHae/jQueryClockIntervalPicker/issues>

##Work in Progress
- [ ] Combine width / height of div and radius
- [ ] 0 - 23 h Clock Layout
- [ ] Costumizable ticks in minutes
- [ ] Text labels for hours

##License
MIT License (MIT)
