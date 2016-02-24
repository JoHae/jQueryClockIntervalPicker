# jQueryClockIntervalPicker

##What ?
A costumizable clock with the ability to choose time intervals interactively.

##Example
see example folder

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

##Requirements
- [jQuery 2.2.0](https://jquery.com)
- [jQuery UI 1.11.4](https://jquery.com)
- [jQuery SVG 1.5.0](https://jquery.com)

Other versions could work as well but are not tested yet.

##Found a bug or got ideas for new features ? 

Submit an issue above or here: 

<https://github.com/JoHae/jQueryClockIntervalPicker/issues>

##Work in Progress
- [ ] 0 - 23 h Clock Layout
- [ ] Costumizable ticks in minutes
- [ ] Text labels for hours

##Licence
MIT License (MIT)
