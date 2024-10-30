// src/App.js

import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { statesAndCities } from './data/statesAndCities';
import { stateNameToCode } from './data/stateNameToCode';

function App() {
  const [taxonomy, setTaxonomy] = useState('');
  const [npiType, setNpiType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [state, setState] = useState('');
  const [currentResults, setCurrentResults] = useState([]);
  const [message, setMessage] = useState('');
  const [sortOrder, setSortOrder] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [currentCity, setCurrentCity] = useState('');
  const [progress, setProgress] = useState(0);
  const [totalCities, setTotalCities] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false); // New state variable for cancellation

  const search = async () => {
    if (!taxonomy && !firstName && !lastName && !state) {
      alert('Please provide at least one search criterion.');
      return;
    }

    setIsSearching(true);
    setCurrentResults([]);
    setMessage('');
    setCurrentCity('');
    setProgress(0);
    setIsCancelled(false); // Reset cancellation flag

    const stateCode = stateNameToCode[state];
    const cities = statesAndCities[state] || [];
    setTotalCities(cities.length);

    if (cities.length === 0) {
      setMessage('No cities found for the selected state.');
      setIsSearching(false);
      return;
    }

    let totalResults = 0;

    for (let i = 0; i < cities.length; i++) {
      if (isCancelled) {
        setMessage(`Search stopped by user. ${totalResults} results found.`);
        break;
      }

      const city = cities[i];
      console.log(`Executing ${state} on ${city}`);
      setCurrentCity(city);
      setProgress(((i + 1) / cities.length) * 100);

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taxonomy,
            firstName,
            lastName,
            city,
            state: stateCode,
            postalCode: '',
            countryCode: 'US',
            npiType,
          }),
        });

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          setCurrentResults((prevResults) => {
            const updatedResults = [...prevResults, ...data.results];
            totalResults = updatedResults.length;
            setMessage(`${totalResults} results found so far.`);
            return updatedResults;
          });
        } else {
          setMessage(`${totalResults} results found so far.`);
        }
      } catch (error) {
        console.error(error);
      }
    }

    setIsSearching(false);
    setCurrentCity('');
    if (!isCancelled) {
      setMessage(`${totalResults} total results found.`);
    }
  };

  const stopSearch = () => {
    setIsCancelled(true);
    setIsSearching(false);
    setCurrentCity('');
    setProgress(0);
    setMessage('Search stopped by user.');
  };

  const sortTable = (columnIndex) => {
    const newSortOrder = { ...sortOrder, [columnIndex]: !sortOrder[columnIndex] };
    setSortOrder(newSortOrder);

    const direction = newSortOrder[columnIndex] ? 1 : -1;

    const sortedResults = [...currentResults].sort((a, b) => {
      const valueA = a[columnIndex] || '';
      const valueB = b[columnIndex] || '';

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });

    setCurrentResults(sortedResults);
  };

  const downloadCSV = () => {
    const csvContent =
      'NPI,NPI Type,Name,Address,City,State,Postal Code,Enumeration Date,Telephone,Position,Taxonomies\n' +
      currentResults.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'results.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="container-fluid">
      <h1 className="text-center">Search NPI Registry</h1>
      <form id="searchForm" className="mt-4">
        {/* Form Fields */}
        <div className="form-group">
          <label htmlFor="taxonomy">Taxonomy Type:</label>
          <input
            type="text"
            className="form-control"
            id="taxonomy"
            placeholder="e.g., Optometrist"
            value={taxonomy}
            onChange={(e) => setTaxonomy(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="npiType">NPI Type:</label>
          <select
            className="form-control"
            id="npiType"
            value={npiType}
            onChange={(e) => setNpiType(e.target.value)}
          >
            <option value="">Select NPI Type</option>
            <option value="NPI-1">Individual (NPI-1)</option>
            <option value="NPI-2">Organization (NPI-2)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="firstName">First Name:</label>
          <input
            type="text"
            className="form-control"
            id="firstName"
            placeholder="e.g., John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name:</label>
          <input
            type="text"
            className="form-control"
            id="lastName"
            placeholder="e.g., Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="state">State:</label>
          <select
            className="form-control"
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Select a state</option>
            {Object.keys(statesAndCities).map((stateName) => (
              <option key={stateName} value={stateName}>
                {stateName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          id="searchButton"
          onClick={search}
          disabled={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
        {isSearching && (
          <button
            type="button"
            className="btn btn-danger ml-2 ms-3"
            onClick={stopSearch}
          >
            Stop
          </button>
        )}
        <button
          type="button"
          className="btn btn-success float-end"
          onClick={downloadCSV}
          disabled={currentResults.length === 0}
        >
          Download CSV
        </button>
      </form>

      <div className="message" id="message">
        {message}
      </div>

      {/* Display current state and city */}
      {isSearching && currentCity && (
        <div className="message">
          Fetching data for {state}, {currentCity}...
        </div>
      )}

      {/* Progress Bar */}
      {isSearching && (
        <div className="progress my-3">
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {Math.round(progress)}%
          </div>
        </div>
      )}

      <table className="table table-bordered table-striped mt-3">
        <thead className="thead-dark">
          {/* Table Headers */}
          <tr>
            <th onClick={() => sortTable(0)}>NPI</th>
            <th onClick={() => sortTable(1)}>NPI Type</th>
            <th onClick={() => sortTable(2)}>Name</th>
            <th onClick={() => sortTable(3)}>Address</th>
            <th onClick={() => sortTable(4)}>City</th>
            <th onClick={() => sortTable(5)}>State</th>
            <th onClick={() => sortTable(6)}>Postal Code</th>
            <th onClick={() => sortTable(7)}>Enumeration Date</th>
            <th onClick={() => sortTable(8)}>Telephone</th>
            <th onClick={() => sortTable(9)}>Position</th>
            <th onClick={() => sortTable(10)}>Taxonomies</th>
          </tr>
        </thead>
        <tbody id="resultsBody">
          {currentResults.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
