// src/App.js

import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Login from './Login'; // Import the Login component
import { statesAndCities } from './data/statesAndCities';
import { stateNameToCode } from './data/stateNameToCode';

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // New state variables for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 20;

  // Use refs for managing search cancellation
  const searchIdRef = useRef(0);
  const abortControllerRef = useRef(null);


  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/check-auth', {
          credentials: 'include',
        });
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error('Authentication check failed.');
      }
    };

    checkAuth();
  }, []);


  const handleLogout = async () => {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setIsAuthenticated(false);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }



  // Search function with updated cancellation logic
  const search = async () => {
    if (!taxonomy && !firstName && !lastName && !state) {
      alert('Please provide at least one search criterion.');
      return;
    }

    // Increment searchId for new search
    const currentSearchId = ++searchIdRef.current;

    // Abort any ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController for this search
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsSearching(true);
    setCurrentResults([]);
    setMessage('');
    setCurrentCity('');
    setProgress(0);
    setCurrentPage(1); // Reset currentPage

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
      // Check if a new search has started
      if (searchIdRef.current !== currentSearchId) {
        // Exit the loop if a new search has started
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
          signal, // Pass the signal to fetch
        });

        // Check if the response was aborted
        if (signal.aborted) {
          console.log('Fetch aborted');
          break;
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          // Check again if a new search has started
          if (searchIdRef.current !== currentSearchId) {
            break;
          }

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
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          break;
        } else {
          console.error(error);
        }
      }
    }

    // Check if the search was not cancelled
    if (searchIdRef.current === currentSearchId) {
      setIsSearching(false);
      setCurrentCity('');
      setMessage(`${totalResults} total results found.`);
      abortControllerRef.current = null;
    }
  };

  const stopSearch = () => {
    // Increment searchId to invalidate the current search
    searchIdRef.current++;

    // Abort ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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
    setCurrentPage(1); // Reset to first page when sorting
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

  // Pagination calculations
  const totalPages = Math.ceil(currentResults.length / resultsPerPage) || 1;
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResultsToDisplay = currentResults.slice(indexOfFirstResult, indexOfLastResult);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Generate page numbers for pagination (optional)
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="container-fluid">
      <button className="btn btn-secondary float-right" onClick={handleLogout}>
        Log Out
      </button>
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
          {currentResultsToDisplay.map((row, index) => (
            <tr key={index + indexOfFirstResult}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination Controls */}
      {currentResults.length > 0 && (
        <div className="pagination">
          <button
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="mx-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
