import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ExpenseTracker from './components/ExpenseTracker';
import TransactionForm from './components/TransactionForm';
import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import ResetPassword from './pages/ResetPassword';
import ManageCategory from './components/ManageCategory';
import ManageLabel from './components/ManageLabel';

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem("token"));
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);


  return (
     <>
     <Routes>
      <Route path="/" element={<Navigate to="/login" />} />

      <Route path="/login" element={<Login setToken={setToken} />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/expense-tracker"
        element={
          token ? <ExpenseTracker setToken={setToken} /> : <Navigate to="/login" />
        }
      />
    
      <Route
        path="/add-transaction"
        element={
          token ? <TransactionForm /> : <Navigate to="/login" />
        }
      />

       <Route
        path="/edit-transaction"
        element={
          token ? <TransactionForm /> : <Navigate to="/login" />
        }
      />

      {/* ✅ New Manage Categories route */}
        <Route
          path="/manage-categories"
          element={token ? <ManageCategory /> : <Navigate to="/login" />}
        />

        {/* ✅ New Manage Labels route */}
        <Route
          path="/manage-labels"
          element={token ? <ManageLabel /> : <Navigate to="/login" />}
        />

      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
    <ToastContainer/>
     </>
    
  );
}

export default App;
