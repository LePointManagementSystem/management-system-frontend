import React, { useState } from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface StaffMember {
    id: number;
    name: string;
    role: string;
    email: string;
    phone: string;
    status: 'Active' | 'On Leave' | 'Terminated';
}

const StaffPage: React.FC = () => {
    const initialStaff: StaffMember[] = [
        { id: 1, name: 'John Doe', role: 'Manager', email: 'john@example.com', phone: '123-456-7890', status: 'Active' },
        { id: 2, name: 'Jane Smith', role: 'Receptionist', email: 'jane@example.com', phone: '234-567-8901', status: 'Active' },
        { id: 3, name: 'Mike Johnson', role: 'Housekeeper', email: 'mike@example.com', phone: '345-678-9012', status: 'On Leave' },
        { id: 4, name: 'Sarah Brown', role: 'Chef', email: 'sarah@example.com', phone: '456-789-0123', status: 'Active' },
        { id: 5, name: 'Tom Wilson', role: 'Maintenance', email: 'tom@example.com', phone: '567-890-1234', status: 'Terminated' },
    ];

    const [staff, setStaff] = useState<StaffMember[]>(initialStaff);

    const columns: TableColumn<StaffMember>[] = [
        {
            name: 'Name',
            selector: (row: StaffMember) => row.name,
            sortable: true,
        },
        {
            name: 'Role',
            selector: (row: StaffMember) => row.role,
            sortable: true,
        },
        {
            name: 'Email',
            selector: (row: StaffMember) => row.email,
            cell: (row: StaffMember) => (
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                    {row.email}
                </a>
            ),
        },
        {
            name: 'Phone',
            selector: (row: StaffMember) => row.phone,
            cell: (row: StaffMember) => (
                <a href={`tel:${row.phone}`} className="text-blue-600 hover:underline">
                    {row.phone}
                </a>
            ),
        },
        {
            name: 'Status',
            selector: (row: StaffMember) => row.status,
            cell: (row: StaffMember) => (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : row.status === 'On Leave'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {row.status}
                </span>
            ),
        },
        {
            name: 'Actions',
            cell: (row: StaffMember) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-600 hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 hover:underline"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const handleEdit = (row: StaffMember) => {
        console.log('Edit:', row);
        // Add your edit logic here
    };

    const handleDelete = (id: number) => {
        setStaff(staff.filter((member) => member.id !== id));
    };

    const customStyles = {
        rows: {
            style: {
                minHeight: '50px',
            },
        },
        headCells: {
            style: {
                backgroundColor: '#f0faf7',
                fontWeight: 'bold',
                fontSize: '16px',
            },
        },
        cells: {
            style: {
                fontSize: '14px',
            },
        },
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-3xl font-bold">Staff Management</h2>
            <DataTable
                title="Staff List"
                columns={columns}
                data={staff}
                pagination
                highlightOnHover
                selectableRows
                dense
                customStyles={customStyles}
            />
        </div>
    );
};

export default StaffPage;
