/**
 * The application's main window.
 *
 * @module
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

/**
 * The index component
 *
 * @component
 */
function Index() {


  return (
    <>
        About Page
    </>
  );
}

/**
 * React bootstrapping logic.
 *
 * @function
 * @name anonymous
 */
(() => {
  // grab the root container
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Failed to find the root element.');
  }

  // render the react application
  ReactDOM.createRoot(container).render(<Index />);
})();