import './App.css';
import TransactionForm from './components/TransactionForm';
import { Routes, Route } from 'react-router-dom';
import ExpenseTracker from './components/ExpenseTracker';

function App() {
  return (
    <Routes>
    
     <Route path="/expense-tracker" element={<ExpenseTracker/>} />
      <Route path="/add-transaction" element={<TransactionForm />} />
    </Routes>
  );
}

export default App;
