export interface LoginCredentials {
    email: string
    password: string
  }
  
  export interface LoginResponse {
    succeeded: boolean
    token?: string
    username?: string
    message?: string
    role?: string
  }
  
  export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await fetch('http://localhost:5004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
        body: JSON.stringify(credentials),
      })
     
      if (!response.ok) {
        const errorData = await response.json()
        console.log(errorData.message)
        return { succeeded: false, message: errorData.message || 'Login failed' }
      }
  
      const data = await response.json()
      console.log(data);
      return { succeeded: true, token: data.data.token, username:data.data.username, role:data.data.roles[0] }
    } catch (error) {
      return { succeeded: false, message: 'Network error' }
    }
}
  