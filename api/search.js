// api/search.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    taxonomy,
    firstName,
    lastName,
    city,
    state,
    postalCode,
    countryCode,
    npiType,
  } = req.body;

  const urlBase = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';
  const params = {
    taxonomy_description: taxonomy || '',
    first_name: firstName || '',
    last_name: lastName || '',
    city: city || '',
    state: state || '',
    postal_code: postalCode || '',
    country_code: countryCode || 'US',
    enumeration_type: npiType || '',
    limit: 200, // Maximum limit per request
  };

  // Ensure at least one additional search criterion is provided
  if (
    !taxonomy &&
    !firstName &&
    !lastName &&
    !city &&
    !state &&
    !postalCode &&
    !npiType
  ) {
    res.status(400).json({ error: 'Please provide at least one search criterion.' });
    return;
  }

  let allResults = [];
  let skip = 0;
  const maxRecords = 1200; // Maximum records to fetch
  let hasMoreResults = true;

  while (hasMoreResults && allResults.length < maxRecords) {
    // Construct the URL with parameters and the current skip value
    const queryParams = Object.keys(params)
      .filter((key) => params[key] !== '') // Exclude empty parameters
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `${urlBase}&${queryParams}&skip=${skip}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        hasMoreResults = false; // No more results
      } else {
        allResults = allResults.concat(data.results);

        if (data.results.length < params.limit) {
          hasMoreResults = false;
        }
      }

      skip += params.limit;

      if (allResults.length >= maxRecords) {
        hasMoreResults = false;
      }
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Error fetching data from NPI Registry API' });
      return;
    }
  }

  // Prepare results
  const results = allResults.map((result) => {
    // Determine the name to use
    let fullName;
    if (result.basic.first_name) {
      fullName =
        result.basic.first_name +
        ' ' +
        (result.basic.middle_name || '') +
        ' ' +
        result.basic.last_name;
    } else if (result.basic.authorized_official_first_name) {
      fullName =
        result.basic.authorized_official_first_name +
        ' ' +
        (result.basic.authorized_official_middle_name || '') +
        ' ' +
        result.basic.authorized_official_last_name;
    } else if (result.basic.organization_name) {
      fullName = result.basic.organization_name;
    } else {
      fullName = 'N/A';
    }

    // Address details
    const address =
      result.addresses && result.addresses.length > 0
        ? result.addresses[0].address_1
        : 'N/A';
    const cityResult =
      result.addresses && result.addresses.length > 0
        ? result.addresses[0].city
        : 'N/A';
    const stateResult =
      result.addresses && result.addresses.length > 0
        ? result.addresses[0].state
        : 'N/A';
    const postalCodeResult =
      result.addresses && result.addresses.length > 0
        ? result.addresses[0].postal_code
        : 'N/A';
    const enumerationDate = result.basic.enumeration_date || 'N/A';

    // Telephone numbers from all addresses
    const telephoneNumbers =
      result.addresses
        .map((addr) => addr.telephone_number)
        .filter((num) => num)
        .join(', ') || 'N/A';

    // Position, if available
    const position = result.basic.authorized_official_title_or_position || 'N/A';

    // Taxonomies descriptions
    const taxonomies =
      result.taxonomies.map((tax) => tax.desc).join(', ') || 'N/A';

    // Enumeration Type
    const enumerationType = result.enumeration_type || 'N/A';

    return [
      result.number,
      enumerationType,
      fullName,
      address,
      cityResult,
      stateResult,
      postalCodeResult,
      enumerationDate,
      telephoneNumbers,
      position,
      taxonomies,
    ];
  });

  res.status(200).json({ results });
};
