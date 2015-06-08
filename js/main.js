import React from 'react';
import 'whatwg-fetch';

class ListItem extends React.Component
{
    render() {
        return <tr>
            <th>{this.props.callsign}</th>
            <td>{this.props.mode}</td>
            <td>{this.props.band}</td>
            <td>{this.props.distance ? this.props.distance.toFixed(2) + 'km' : ''}</td>
            <td>{this.props.bearing ? this.props.bearing.toFixed(0) + '°' : ''}</td>
        </tr>;
    }
}

class ListView extends React.Component
{
    render() {
        let items = this.props.repeaters.map(r => <ListItem {...r} />);
        return <table className='u-full-width'>
            <thead>
                <th>Callsign</th>
                <th>Mode</th>
                <th>Band</th>
                <th>Distance</th>
                <th>Bearing</th>
            </thead>
            <tbody>{items}</tbody>
        </table>;
    }
}

class Sorter extends React.Component
{
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);

        this.state = {
            options: new Map([
                ['distance', 'Distance'],
                ['callsign', 'Callsign'],
                ['bearing', 'Bearing']
            ])
        }
    }

    handleChange(event) {
        this.props.sortChange(event.target.value);
    }

    render() {
        "use strict";
        let options = [];
        for (let [key, name] of this.state.options) {
            options.push(<option key={key} value={key}>Sort by {name}</option>);
        }

        return <select id="sortBy" className="u-full-width" onChange={this.handleChange}>
                {options}
            </select>
    }
}

class App extends React.Component
{
    constructor(props) {
        "use strict";
        super(props);
        this.onSortChange = this.onSortChange.bind(this);

        this.state = {
            repeaters: props.store.sort(),
            sortOrder: props.sortOrder
        }
    }

    componentDidMount() {
        this.props.getPosition().then(pos => {
            this.props.store.updatePosition(pos);
            this.setState({
                repeaters: this.props.store.sort(this.state.sortOrder)
            });
        });
    }

    onSortChange(newValue) {
        let newList = this.props.store.sort(newValue);
        this.setState({
            sortOrder: newValue,
            repeaters: newList
        });
    }

    render() {
        "use strict";
        return <div>
                <Sorter sortChange={this.onSortChange} />
                <ListView repeaters={this.state.repeaters} />
            </div>
    }
}

class RepeaterStore
{
    constructor(repeaters) {
        this.repeaters = repeaters.map(r => {
            r.key = [r.callsign, r.band, r.input, r.output].join('-');
            return r;
        });

        this.sort.bind(this);
    }

    updatePosition(position) {
        this.position = position;

        this.repeaters.forEach(r => {
            let repeaterPosition = { lat: r.latitude, lon: r.longitude };
            r.distance = this.haversine(position, repeaterPosition);
            r.bearing = this.bearing(position, repeaterPosition);
            return r;
        });

        return this;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    toDeg(value) {
        return value / Math.PI * 180;
    }

    haversine(from, to) {
        var R = 6371; // km
        var dLat = this.toRad(to.lat - from.lat);
        var dLon = this.toRad(to.lon - from.lon);
        var fromLat = this.toRad(from.lat);
        var toLat = this.toRad(to.lat);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) *
            Math.cos(fromLat) * Math.cos(toLat);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    bearing(from, to) {
        var fromLat = this.toRad(from.lat);
        var toLat = this.toRad(to.lat);

        var dLat = this.toRad(to.lat - from.lat);
        var dLon = this.toRad(to.lon - from.lon);

        var y = Math.sin(dLon) * Math.cos(toLat);
        var x = Math.cos(fromLat) * Math.sin(toLat) -
            Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);

        var bearing = this.toDeg(Math.atan2(y, x));
        return (bearing + 360) % 360;
    }

    items() {
        return this.repeaters;
    }

    sort(by = 'distance') {
        return this.repeaters.sort((a, b) => {
            if (a[by] == b[by]) return 0;
            return a[by] > b[by] ? 1 : -1;
        })
    }
}

class Locator
{
    static getPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                position => {
                    let pos = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };

                    resolve(pos);
                },
                error => reject(error),
                { enableHighAccuracy: true }
            );
        });
    }
}

fetch('repeaters.json')
    .then(r => r.json())
    .then(r => new RepeaterStore(r))
    .then(store => {
        React.render(<App store={store} getPosition={Locator.getPosition} />, document.getElementById('container'))
    });


