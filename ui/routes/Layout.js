import React from 'react';
import { Route, Switch } from 'react-router';
import routes from './index';
import Navbar from '../components/Navbar';


const Layout = () =>
  (<div>
    <Navbar />
    <div className="container">
      <Switch>
        {routes.map(route => <Route key={`route-${route.name}`} {...route} />)}
      </Switch>
    </div>
  </div>);

export default Layout;
