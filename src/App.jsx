import React, { useState, useRef } from 'react';

const BabyNameGenerator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [gender, setGender] = useState('boy');
  const [startingLetter, setStartingLetter] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState([]);
  const [apiLogs, setApiLogs] = useState([]);
  const [showRawData, setShowRawData] = useState(false);
  const [rawApiData, setRawApiData] = useState(null);
  const [createdObjects, setCreatedObjects] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE = 'https://staging.impromptu-labs.com/api_tools';
  const API_HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 5bqm3wlkr7fmckumijd'
  };

  const logApiCall = (method, endpoint, data, response) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      request: data,
      response
    };
    setApiLogs(prev => [...prev, logEntry]);
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setCurrentStep(2);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const generateNames = async () => {
    if (!startingLetter.trim()) {
      alert('Please enter a starting letter');
      return;
    }

    setLoading(true);
    setCurrentStep(2);

    try {
      // Step 1: Create input data
      const inputData = {
        created_object_name: 'name_preferences',
        data_type: 'strings',
        input_data: [`Generate 5 ${gender} names starting with letter ${startingLetter.toUpperCase()}`]
      };

      const inputResponse = await fetch(`${API_BASE}/input_data`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(inputData)
      });

      const inputResult = await inputResponse.json();
      logApiCall('POST', '/input_data', inputData, inputResult);
      setCreatedObjects(prev => [...prev, 'name_preferences']);

      // Step 2: Apply prompt to generate names
      const promptData = {
        created_object_names: ['generated_names'],
        prompt_string: 'Based on the request: {name_preferences}, generate exactly 5 unique, real baby names with their meanings and origins. Format as JSON array: [{"name": "Name", "meaning": "Meaning and origin"}]',
        inputs: [
          {
            object_name: 'name_preferences',
            processing_mode: 'combine_events'
          }
        ]
      };

      const promptResponse = await fetch(`${API_BASE}/apply_prompt`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(promptData)
      });

      const promptResult = await promptResponse.json();
      logApiCall('POST', '/apply_prompt', promptData, promptResult);
      setCreatedObjects(prev => [...prev, 'generated_names']);

      // Step 3: Retrieve generated names
      const dataResponse = await fetch(`${API_BASE}/return_data/generated_names`, {
        method: 'GET',
        headers: API_HEADERS
      });

      const dataResult = await dataResponse.json();
      logApiCall('GET', '/return_data/generated_names', null, dataResult);

      setRawApiData({
        input: inputResult,
        prompt: promptResult,
        data: dataResult
      });

      // Parse the names from the response
      try {
        const namesText = dataResult.text_value;
        const jsonMatch = namesText.match(/\[.*\]/s);
        if (jsonMatch) {
          const parsedNames = JSON.parse(jsonMatch[0]);
          setNames(parsedNames);
        } else {
          // Fallback parsing
          const nameLines = namesText.split('\n').filter(line => line.trim());
          const fallbackNames = nameLines.slice(0, 5).map((line, index) => ({
            name: `Name ${index + 1}`,
            meaning: line.trim()
          }));
          setNames(fallbackNames);
        }
      } catch (error) {
        console.error('Error parsing names:', error);
        setNames([{ name: 'Error', meaning: 'Failed to parse generated names' }]);
      }

      setCurrentStep(3);
    } catch (error) {
      console.error('Error generating names:', error);
      setNames([{ name: 'Error', meaning: 'Failed to generate names. Please try again.' }]);
      setCurrentStep(3);
    }
    setLoading(false);
  };

  const deleteObjects = async () => {
    for (const objectName of createdObjects) {
      try {
        const response = await fetch(`${API_BASE}/objects/${objectName}`, {
          method: 'DELETE',
          headers: API_HEADERS
        });
        const result = await response.json();
        logApiCall('DELETE', `/objects/${objectName}`, null, result);
      } catch (error) {
        console.error(`Error deleting ${objectName}:`, error);
      }
    }
    setCreatedObjects([]);
    setNames([]);
    setRawApiData(null);
  };

  const downloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Meaning\n"
      + names.map(n => `"${n.name}","${n.meaning}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `baby_names_${gender}_${startingLetter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setUploadedFile(null);
    setNames([]);
    setStartingLetter('');
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Baby Name Generator
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-2xl transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-white text-gray-900 hover:bg-gray-100'
            } shadow-lg`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-center space-x-4 mb-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep >= step
                    ? 'bg-primary-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {currentStep === 1 && 'Configure Preferences'}
              {currentStep === 2 && 'Generating Names'}
              {currentStep === 3 && 'View Results'}
            </span>
          </div>
        </div>

        {/* Step 1: File Upload & Configuration */}
        {currentStep === 1 && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upload Card */}
            <div className={`rounded-2xl shadow-lg p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Upload Name List (Optional)
              </h3>
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  darkMode 
                    ? 'border-gray-600 hover:border-primary-400 bg-gray-700' 
                    : 'border-gray-300 hover:border-primary-400 bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mb-4">
                  <svg className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className={`text-lg mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Drag and drop your file here
                </p>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  or
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-medium transition-colors"
                  aria-label="Choose file to upload"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept=".txt,.csv,.json"
                />
              </div>
              {uploadedFile && (
                <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Uploaded: {uploadedFile.name}
                  </p>
                </div>
              )}
            </div>

            {/* Configuration Card */}
            <div className={`rounded-2xl shadow-lg p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Name Preferences
              </h3>
              
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Gender
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="boy"
                      checked={gender === 'boy'}
                      onChange={(e) => setGender(e.target.value)}
                      className="mr-2 text-primary-500 focus:ring-primary-500"
                      aria-describedby="gender-help"
                    />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Boy</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="girl"
                      checked={gender === 'girl'}
                      onChange={(e) => setGender(e.target.value)}
                      className="mr-2 text-primary-500 focus:ring-primary-500"
                      aria-describedby="gender-help"
                    />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Girl</span>
                  </label>
                </div>
                <p id="gender-help" className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Select the gender for name suggestions
                </p>
              </div>

              <div className="mb-8">
                <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Starting Letter
                </label>
                <input
                  type="text"
                  value={startingLetter}
                  onChange={(e) => setStartingLetter(e.target.value.slice(0, 1).toUpperCase())}
                  placeholder="Enter a letter (A-Z)"
                  maxLength="1"
                  className={`w-20 h-12 text-center text-xl font-semibold rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  aria-describedby="letter-help"
                />
                <p id="letter-help" className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Names will start with this letter
                </p>
              </div>

              <button
                onClick={generateNames}
                disabled={!startingLetter.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Generate baby names"
              >
                Generate Names
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Loading */}
        {currentStep === 2 && loading && (
          <div className={`rounded-2xl shadow-lg p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="spinner mx-auto mb-6"></div>
            <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Generating Names...
            </h3>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Creating personalized name suggestions for you
            </p>
            <button
              onClick={() => {
                setLoading(false);
                setCurrentStep(1);
              }}
              className={`mt-6 px-6 py-2 rounded-xl transition-colors ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              aria-label="Cancel name generation"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && names.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)} Names Starting with "{startingLetter}"
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadCSV}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  aria-label="Download names as CSV"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  aria-label="Show raw API data"
                >
                  {showRawData ? 'Hide' : 'Show'} Raw Data
                </button>
                <button
                  onClick={deleteObjects}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  aria-label="Delete generated data objects"
                >
                  Delete Objects
                </button>
                <button
                  onClick={resetFlow}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="Start over"
                >
                  Start Over
                </button>
              </div>
            </div>

            {/* Names Table */}
            <div className={`rounded-2xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <table className={`table table-hover w-full ${darkMode ? 'table-dark' : ''}`}>
                <thead className={darkMode ? 'table-dark' : 'table-light'}>
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left font-semibold">Name</th>
                    <th scope="col" className="px-6 py-4 text-left font-semibold">Meaning & Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {names.map((nameObj, index) => (
                    <tr key={index} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {nameObj.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {nameObj.meaning}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Raw API Data */}
        {showRawData && rawApiData && (
          <div className={`mt-8 rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Raw API Data
            </h4>
            <pre className={`text-xs overflow-auto p-4 rounded-xl ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              {JSON.stringify(rawApiData, null, 2)}
            </pre>
          </div>
        )}

        {/* API Logs */}
        {apiLogs.length > 0 && (
          <div className={`mt-8 rounded-2xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              API Call Logs
            </h4>
            <div className="space-y-4 max-h-96 overflow-auto">
              {apiLogs.map((log, index) => (
                <div key={index} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {log.method} {log.endpoint} - {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <details className="mt-2">
                    <summary className={`cursor-pointer text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      View Details
                    </summary>
                    <pre className={`text-xs mt-2 p-2 rounded ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>
                      {JSON.stringify({ request: log.request, response: log.response }, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BabyNameGenerator;
