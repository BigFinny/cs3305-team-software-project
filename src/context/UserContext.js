import React, { useContext, useState } from "react"

const UserContext = React.createContext();
const UserSetContext = React.createContext();

export function useUser() {
    return useContext(UserContext);
}

export function useUserSet() {
    return useContext(UserSetContext);
}

export default function UserProvider({ children }) {
    const [ user, setUser ] = useState({
        email: "test@example.com",
        emailVerified: true
    });
    // const [ user, setUser ] = useState(null);

    return (
        <UserContext.Provider value={user}>
            <UserSetContext.Provider value={setUser}>
                {children}
            </UserSetContext.Provider>
        </UserContext.Provider>
    )
}
